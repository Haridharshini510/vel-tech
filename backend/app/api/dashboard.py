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


@router.get("/emerging-skills")
async def get_emerging_skills(limit: int = 10, min_ratio: float = 2.0):
    """Skills that appear disproportionately more in recent Adzuna data
    than in historical Naukri data, signalling emerging market demand."""
    db = get_db()

    # Total jobs per source (needed for percentage calculation)
    total_adzuna = await db.jobs.count_documents({"source": "adzuna"})
    total_naukri = await db.jobs.count_documents({"source": "naukri"})

    if total_adzuna == 0 or total_naukri == 0:
        return {"emerging_skills": [], "total_adzuna": total_adzuna,
                "total_naukri": total_naukri}

    # Aggregate skill counts from Adzuna (recent/live)
    adzuna_pipeline = [
        {"$match": {"source": "adzuna", "normalized_skills.0": {"$exists": True}}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
    ]
    adzuna_results = await db.jobs.aggregate(adzuna_pipeline).to_list(length=500)
    adzuna_counts = {r["_id"]: r["count"] for r in adzuna_results}

    # Aggregate skill counts from Naukri (historical)
    naukri_pipeline = [
        {"$match": {"source": "naukri", "normalized_skills.0": {"$exists": True}}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
    ]
    naukri_results = await db.jobs.aggregate(naukri_pipeline).to_list(length=500)
    naukri_counts = {r["_id"]: r["count"] for r in naukri_results}

    # Calculate emergence ratio for every Adzuna skill
    emerging = []
    for skill, adzuna_count in adzuna_counts.items():
        adzuna_pct = adzuna_count / total_adzuna
        naukri_count = naukri_counts.get(skill, 0)
        # Use a small floor (0.5 / total_naukri) to avoid division by zero
        # when the skill is completely absent from Naukri data
        naukri_pct = max(naukri_count / total_naukri, 0.5 / total_naukri)
        ratio = round(adzuna_pct / naukri_pct, 2)

        if ratio > min_ratio:
            emerging.append({
                "skill": skill,
                "adzuna_count": adzuna_count,
                "naukri_count": naukri_count,
                "adzuna_pct": round(adzuna_pct * 100, 2),
                "naukri_pct": round((naukri_count / total_naukri) * 100, 2),
                "emergence_ratio": ratio,
            })

    # Sort by emergence ratio descending and take top N
    emerging.sort(key=lambda x: x["emergence_ratio"], reverse=True)
    emerging = emerging[:limit]

    # Enrich with category from the skills collection
    for item in emerging:
        skill_doc = await db.skills.find_one({"canonical_name": item["skill"]})
        item["category"] = skill_doc["category"] if skill_doc else ""

    return {
        "emerging_skills": emerging,
        "total_adzuna": total_adzuna,
        "total_naukri": total_naukri,
    }


@router.get("/curriculum-overview")
async def get_curriculum_overview():
    """Summary of all courses with their relevance scores,
    highlighting programmes that may need curriculum updates."""
    db = get_db()

    courses = await db.courses.find(
        {}, {"name": 1, "relevance_score": 1}
    ).to_list(length=200)

    total_courses = len(courses)
    if total_courses == 0:
        return {
            "total_courses": 0,
            "average_relevance": 0,
            "courses_needing_review": 0,
            "courses": [],
        }

    scores = [c.get("relevance_score") for c in courses]
    valid_scores = [s for s in scores if s is not None]
    average_relevance = round(sum(valid_scores) / len(valid_scores), 2) if valid_scores else 0

    REVIEW_THRESHOLD = 30.0  # percentage
    needing_review = [
        s for s in valid_scores if s < REVIEW_THRESHOLD
    ]

    course_list = []
    for c in courses:
        score = c.get("relevance_score")
        course_list.append({
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "relevance_score": score,
            "needs_review": score is not None and score < REVIEW_THRESHOLD,
        })

    # Sort: lowest relevance first so at-risk courses are prominent
    course_list.sort(key=lambda x: x["relevance_score"] if x["relevance_score"] is not None else 999)

    return {
        "total_courses": total_courses,
        "average_relevance": average_relevance,
        "courses_needing_review": len(needing_review),
        "courses": course_list,
    }
