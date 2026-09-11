from fastapi import APIRouter

from app.core.database import get_db

router = APIRouter(tags=["Dashboard"])


@router.get("/stats")
async def get_stats():
    db = get_db()
    total_jobs = await db.jobs.count_documents({})
    total_companies = len(await db.jobs.distinct("company"))
    total_skills = await db.skills.count_documents({})
    total_courses = await db.courses.count_documents({})
    jobs_with_skills = await db.jobs.count_documents({"normalized_skills.0": {"$exists": True}})
    total_gaps = await db.skill_gaps.count_documents({})
    return {
        "total_jobs": total_jobs,
        "total_companies": total_companies,
        "total_skills": total_skills,
        "total_courses": total_courses,
        "jobs_with_skills": jobs_with_skills,
        "total_gaps": total_gaps,
    }


@router.get("/trending-skills")
async def get_trending_skills(limit: int = 15):
    db = get_db()
    pipeline = [
        {"$match": {"normalized_skills.0": {"$exists": True}}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    results = await db.jobs.aggregate(pipeline).to_list(length=limit)

    trending = []
    for r in results:
        skill_doc = await db.skills.find_one({"canonical_name": r["_id"]})
        category = skill_doc["category"] if skill_doc else ""
        trending.append({"skill": r["_id"], "count": r["count"], "category": category})

    return trending


@router.get("/job-trends")
async def get_job_trends():
    """Aggregate job postings by month for a trends chart."""
    db = get_db()
    pipeline = [
        {"$match": {"posted_date": {"$ne": None}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$posted_date"},
                "month": {"$month": "$posted_date"},
            },
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    results = await db.jobs.aggregate(pipeline).to_list(length=100)

    months = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    trends = []
    for r in results:
        y = r["_id"]["year"]
        m = r["_id"]["month"]
        trends.append({
            "month": f"{months[m]} {y}",
            "count": r["count"],
        })

    return trends


@router.get("/category-distribution")
async def get_category_distribution(limit: int = 10):
    """Top job categories by count."""
    db = get_db()
    pipeline = [
        {"$match": {"category": {"$ne": ""}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    results = await db.jobs.aggregate(pipeline).to_list(length=limit)
    return [{"category": r["_id"], "count": r["count"]} for r in results]


@router.get("/recent-jobs")
async def get_recent_jobs(
    page: int = 1,
    limit: int = 20,
    source: str = None,
    search: str = None,
    skill: str = None,
    location: str = None,
):
    db = get_db()
    skip = (page - 1) * limit

    query = {}
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
        ]
    if skill:
        query["normalized_skills"] = skill
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    cursor = db.jobs.find(
        query,
        {"description": 0, "skill_matches": 0, "extracted_skills": 0},
    ).sort("posted_date", -1).skip(skip).limit(limit)

    jobs = await cursor.to_list(length=limit)
    total = await db.jobs.count_documents(query)

    for job in jobs:
        job["id"] = str(job.pop("_id"))

    return {
        "jobs": jobs,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }
