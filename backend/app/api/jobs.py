from fastapi import APIRouter
from collections import Counter

from app.core.database import get_db
from app.services.adzuna import fetch_multiple_pages, fetch_broad
from app.nlp.skill_extractor import extract_skills
from app.nlp.skill_matcher import resolve_skills

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/sync")
async def sync_adzuna_jobs(pages: int = 1, keyword: str = ""):
    """Fetch live jobs from Adzuna for a single keyword, deduplicate, process skills, store."""
    db = get_db()

    fetched = await fetch_multiple_pages(pages=pages, what=keyword)
    if not fetched:
        return {"message": "No jobs fetched from Adzuna.", "new_jobs": 0}

    new_jobs = await _deduplicate_and_process(db, fetched)

    return {
        "message": f"Synced {len(new_jobs)} new jobs from Adzuna.",
        "fetched": len(fetched),
        "new_jobs": len(new_jobs),
        "duplicates_skipped": len(fetched) - len(new_jobs),
    }


@router.post("/sync-broad")
async def sync_broad():
    """Fetch jobs across multiple search keywords for broader coverage."""
    db = get_db()

    fetched = await fetch_broad()
    if not fetched:
        return {"message": "No jobs fetched from Adzuna.", "new_jobs": 0}

    new_jobs = await _deduplicate_and_process(db, fetched)

    return {
        "message": f"Broad sync complete. {len(new_jobs)} new jobs from Adzuna.",
        "fetched": len(fetched),
        "new_jobs": len(new_jobs),
        "duplicates_skipped": len(fetched) - len(new_jobs),
    }


@router.get("/sources")
async def get_source_stats():
    """Get job count breakdown by source."""
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
    ]
    results = await db.jobs.aggregate(pipeline).to_list(length=10)
    return {r["_id"]: r["count"] for r in results}


async def _deduplicate_and_process(db, fetched: list[dict]) -> list[dict]:
    """Deduplicate against DB, extract/normalize skills, insert new jobs."""
    # Check existing adzuna_ids for fast dedup
    existing_ids = set()
    adzuna_ids = [j.get("adzuna_id") for j in fetched if j.get("adzuna_id")]
    if adzuna_ids:
        cursor = db.jobs.find(
            {"adzuna_id": {"$in": adzuna_ids}},
            {"adzuna_id": 1}
        )
        async for doc in cursor:
            existing_ids.add(doc.get("adzuna_id"))

    new_jobs = []
    for job in fetched:
        aid = job.get("adzuna_id")
        if aid and aid in existing_ids:
            continue
        # Fallback dedup by title+company
        if not aid:
            exists = await db.jobs.find_one({
                "title": job["title"],
                "company": job["company"],
                "source": "adzuna",
            })
            if exists:
                continue
        new_jobs.append(job)

    if not new_jobs:
        return []

    # Process skills
    for job in new_jobs:
        extracted = extract_skills(job["title"], job["description"], job["raw_skills"])
        resolved, _ = resolve_skills(extracted)
        job["extracted_skills"] = extracted
        job["normalized_skills"] = [r["canonical"] for r in resolved]
        job["skill_matches"] = resolved

    await db.jobs.insert_many(new_jobs)

    # Update demand counts
    skill_counts = Counter()
    for job in new_jobs:
        for skill in job["normalized_skills"]:
            skill_counts[skill] += 1

    for skill_name, count in skill_counts.items():
        await db.skills.update_one(
            {"canonical_name": skill_name},
            {"$inc": {"demand_count": count}},
        )

    return new_jobs
