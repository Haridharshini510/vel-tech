from fastapi import APIRouter, Query
from typing import Optional

from app.core.database import get_db

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("")
async def list_companies(limit: int = 50, search: str = ""):
    db = get_db()
    match_stage = {}
    if search:
        match_stage = {"$match": {"company": {"$regex": search, "$options": "i"}}}

    pipeline = []
    if match_stage:
        pipeline.append(match_stage)
    pipeline.extend([
        {"$group": {
            "_id": "$company",
            "job_count": {"$sum": 1},
            "top_skills": {"$push": "$normalized_skills"},
        }},
        {"$sort": {"job_count": -1}},
        {"$limit": limit},
    ])
    results = await db.jobs.aggregate(pipeline).to_list(length=limit)

    companies = []
    for r in results:
        if not r["_id"]:
            continue
        # Flatten and count top skills
        from collections import Counter
        skill_counter = Counter()
        for skills_list in r["top_skills"]:
            for s in skills_list:
                skill_counter[s] += 1
        top_3 = [s for s, _ in skill_counter.most_common(3)]

        companies.append({
            "name": r["_id"],
            "job_count": r["job_count"],
            "top_skills": top_3,
        })

    return companies


@router.get("/{company_name}/roles")
async def get_company_roles(company_name: str):
    db = get_db()
    pipeline = [
        {"$match": {"company": {"$regex": f"^{company_name}$", "$options": "i"}}},
        {"$group": {"_id": "$title", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    results = await db.jobs.aggregate(pipeline).to_list(length=20)
    return [{"role": r["_id"], "count": r["count"]} for r in results if r["_id"]]


@router.get("/{company_name}/roles/{role}")
async def get_company_role_skills(company_name: str, role: str):
    db = get_db()
    query = {
        "company": {"$regex": f"^{company_name}$", "$options": "i"},
        "title": {"$regex": role, "$options": "i"},
    }
    total = await db.jobs.count_documents(query)

    pipeline = [
        {"$match": query},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 30},
    ]
    results = await db.jobs.aggregate(pipeline).to_list(length=30)

    skills = []
    for r in results:
        pct = round((r["count"] / total) * 100, 1) if total > 0 else 0
        skills.append({"skill": r["_id"], "count": r["count"], "percentage": pct})

    # Get sample job postings
    sample_jobs = await db.jobs.find(
        query,
        {"title": 1, "company": 1, "location": 1, "posted_date": 1, "salary": 1, "source": 1}
    ).sort("posted_date", -1).limit(5).to_list(length=5)
    for job in sample_jobs:
        job["id"] = str(job.pop("_id"))

    return {
        "company": company_name,
        "role": role,
        "total_postings": total,
        "skills": skills,
        "sample_jobs": sample_jobs,
    }


@router.get("/{company_name}/roles/{role}/compare")
async def compare_with_course(company_name: str, role: str, course_id: str = Query(...)):
    db = get_db()

    role_data = await get_company_role_skills(company_name, role)
    company_skills_list = role_data["skills"]
    company_skills_lower = {s["skill"].lower(): s for s in company_skills_list}

    curriculum = await db.curricula.find_one({"course_id": course_id})
    if not curriculum:
        return {"error": "Course not found"}

    normalized = curriculum.get("normalized_skills", curriculum.get("skills", []))
    curriculum_skills_lower = {s.lower() for s in normalized}

    matched = []
    delta = []
    for s in company_skills_list:
        skill_lower = s["skill"].lower()
        if skill_lower in curriculum_skills_lower:
            matched.append(s)
        else:
            delta.append(s)

    course = await db.courses.find_one({"course_id": course_id}) or {}

    # Coverage percentage
    coverage = round((len(matched) / len(company_skills_list)) * 100, 1) if company_skills_list else 0

    return {
        "company": company_name,
        "role": role,
        "course_id": course_id,
        "coverage": coverage,
        "matched_skills": matched,
        "training_delta": delta,
        "total_company_skills": len(company_skills_list),
        "total_matched": len(matched),
        "total_delta": len(delta),
    }
