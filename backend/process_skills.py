"""
Phase 2: Process all jobs through the Skill Intelligence Engine.
Extracts skills, normalizes them, updates the database.

Run: python process_skills.py
"""
import asyncio
import time
from collections import Counter

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.data.skill_dictionary import SKILL_DICTIONARY
from app.nlp.skill_extractor import extract_skills
from app.nlp.skill_matcher import resolve_skills


async def process_all_jobs():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.database_name]

    total = await db.jobs.count_documents({})
    print(f"Processing {total} jobs...\n")

    # --- Pre-warm the sentence-transformers model ---
    print("Loading semantic model (first time may download ~90MB)...")
    from app.nlp.skill_matcher import _get_embedder
    _get_embedder()
    print("Model loaded.\n")

    batch_size = 100
    processed = 0
    global_skill_counter = Counter()
    global_unresolved = Counter()
    total_extracted = 0
    total_resolved = 0

    start = time.time()

    cursor = db.jobs.find({}, {"title": 1, "description": 1, "raw_skills": 1})

    batch = []
    async for job in cursor:
        batch.append(job)
        if len(batch) >= batch_size:
            await _process_batch(db, batch, global_skill_counter, global_unresolved)
            processed += len(batch)
            elapsed = time.time() - start
            rate = processed / elapsed if elapsed > 0 else 0
            print(f"  Processed {processed}/{total} jobs ({rate:.0f} jobs/sec)")
            batch = []

    if batch:
        await _process_batch(db, batch, global_skill_counter, global_unresolved)
        processed += len(batch)

    elapsed = time.time() - start
    print(f"\nAll {processed} jobs processed in {elapsed:.1f}s")

    # --- Seed the skills collection ---
    print("\nSeeding skills collection...")
    await db.skills.delete_many({})
    skill_docs = []
    for canonical, info in SKILL_DICTIONARY.items():
        count = global_skill_counter.get(canonical, 0)
        skill_docs.append({
            "canonical_name": canonical,
            "category": info["category"],
            "aliases": info["aliases"],
            "demand_count": count,
        })
    if skill_docs:
        await db.skills.insert_many(skill_docs)
    await db.skills.create_index("canonical_name")
    await db.skills.create_index("category")
    print(f"Inserted {len(skill_docs)} canonical skills.")

    # --- Print top skills ---
    print("\n--- Top 30 Skills by Demand ---")
    for skill, count in global_skill_counter.most_common(30):
        print(f"  {skill:35s} {count:>5d} jobs")

    print(f"\n--- Top 20 Unresolved Phrases ---")
    for phrase, count in global_unresolved.most_common(20):
        print(f"  {phrase:45s} {count:>4d}")

    # --- Stats ---
    jobs_with_skills = await db.jobs.count_documents({"normalized_skills.0": {"$exists": True}})
    print(f"\nJobs with at least 1 normalized skill: {jobs_with_skills}/{total}")

    client.close()


async def _process_batch(db, batch, skill_counter, unresolved_counter):
    """Process a batch of jobs: extract -> resolve -> update DB."""
    from pymongo import UpdateOne

    updates = []

    for job in batch:
        title = job.get("title", "")
        description = job.get("description", "")
        raw_skills = job.get("raw_skills", [])

        extracted = extract_skills(title, description, raw_skills)
        resolved, unresolved = resolve_skills(extracted)

        canonical_names = [r["canonical"] for r in resolved]

        for name in canonical_names:
            skill_counter[name] += 1
        for phrase in unresolved:
            unresolved_counter[phrase] += 1

        updates.append(
            UpdateOne(
                {"_id": job["_id"]},
                {"$set": {
                    "extracted_skills": extracted,
                    "normalized_skills": canonical_names,
                    "skill_matches": resolved,
                }},
            )
        )

    if updates:
        await db.jobs.bulk_write(updates)


if __name__ == "__main__":
    asyncio.run(process_all_jobs())
