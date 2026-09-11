from fastapi import APIRouter

from app.core.database import get_db

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("")
async def list_skills(limit: int = 100):
    db = get_db()
    skills = await db.skills.find().sort("demand_count", -1).to_list(length=limit)
    for skill in skills:
        skill["id"] = str(skill.pop("_id"))
    return skills


@router.get("/{skill_name}/postings")
async def get_skill_postings(skill_name: str, page: int = 1, limit: int = 10):
    db = get_db()
    skip = (page - 1) * limit

    # Exact match on normalized_skills array
    query = {"normalized_skills": skill_name}
    total = await db.jobs.count_documents(query)

    # If no exact match, try case-insensitive
    if total == 0:
        query = {"normalized_skills": {"$regex": f"^{skill_name}$", "$options": "i"}}
        total = await db.jobs.count_documents(query)

    cursor = db.jobs.find(
        query,
        {"description": 0, "skill_matches": 0, "extracted_skills": 0},
    ).sort("posted_date", -1).skip(skip).limit(limit)
    jobs = await cursor.to_list(length=limit)

    for job in jobs:
        job["id"] = str(job.pop("_id"))

    # Get top companies and roles for this skill
    company_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$company", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    companies = await db.jobs.aggregate(company_pipeline).to_list(length=15)

    role_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$title", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    roles = await db.jobs.aggregate(role_pipeline).to_list(length=15)

    # Get source breakdown
    source_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
    ]
    sources = await db.jobs.aggregate(source_pipeline).to_list(length=10)

    # Get skill metadata
    skill_doc = await db.skills.find_one({"canonical_name": skill_name})
    category = skill_doc["category"] if skill_doc else ""

    return {
        "skill": skill_name,
        "category": category,
        "total_postings": total,
        "companies": [{"name": c["_id"], "count": c["count"]} for c in companies if c["_id"]],
        "roles": [{"title": r["_id"], "count": r["count"]} for r in roles if r["_id"]],
        "sources": [{"source": s["_id"], "count": s["count"]} for s in sources],
        "jobs": jobs,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }
