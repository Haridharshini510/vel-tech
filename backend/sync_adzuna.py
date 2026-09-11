"""
Pre-cache Adzuna live jobs into the database.
Run: python sync_adzuna.py
"""
import asyncio
import time
from collections import Counter

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.services.adzuna import fetch_jobs, SEARCH_KEYWORDS
from app.nlp.skill_extractor import extract_skills
from app.nlp.skill_matcher import resolve_skills


async def sync():
    client = AsyncIOMotorClient(settings.mongodb_uri, tlsCAFile=certifi.where())
    db = client[settings.database_name]

    existing_before = await db.jobs.count_documents({"source": "adzuna"})
    print(f"Existing Adzuna jobs in DB: {existing_before}\n")

    # Pre-warm semantic model
    print("Loading semantic model...")
    from app.nlp.skill_matcher import _get_embedder
    _get_embedder()
    print("Ready.\n")

    all_new = []
    total_fetched = 0
    skill_counter = Counter()

    for kw in SEARCH_KEYWORDS:
        print(f"Fetching: '{kw}'...")
        try:
            jobs = await fetch_jobs(page=1, results_per_page=50, what=kw)
            total_fetched += len(jobs)
            print(f"  Got {len(jobs)} results")
        except Exception as e:
            print(f"  ERROR: {e}")
            continue

        new_count = 0
        for job in jobs:
            # Dedup by adzuna_id
            aid = job.get("adzuna_id")
            if aid:
                exists = await db.jobs.find_one({"adzuna_id": aid})
                if exists:
                    continue

            # Process skills
            extracted = extract_skills(job["title"], job["description"], job["raw_skills"])
            resolved, _ = resolve_skills(extracted)
            job["extracted_skills"] = extracted
            job["normalized_skills"] = [r["canonical"] for r in resolved]
            job["skill_matches"] = resolved

            await db.jobs.insert_one(job)
            new_count += 1
            all_new.append(job)

            for skill in job["normalized_skills"]:
                skill_counter[skill] += 1

        print(f"  Inserted {new_count} new jobs")

    # Update skill demand counts
    print("\nUpdating skill demand counts...")
    for skill_name, count in skill_counter.items():
        await db.skills.update_one(
            {"canonical_name": skill_name},
            {"$inc": {"demand_count": count}},
        )

    existing_after = await db.jobs.count_documents({"source": "adzuna"})
    total_jobs = await db.jobs.count_documents({})

    print(f"\n=== Sync Summary ===")
    print(f"Keywords searched: {len(SEARCH_KEYWORDS)}")
    print(f"Total fetched: {total_fetched}")
    print(f"New jobs inserted: {len(all_new)}")
    print(f"Adzuna jobs in DB: {existing_after}")
    print(f"Total jobs in DB: {total_jobs}")

    if skill_counter:
        print(f"\nTop skills from new Adzuna jobs:")
        for skill, count in skill_counter.most_common(15):
            print(f"  {skill}: {count}")

    print("\nDone!")
    client.close()


if __name__ == "__main__":
    asyncio.run(sync())
