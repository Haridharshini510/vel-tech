from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException

from app.core.database import get_db

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("")
async def list_courses():
    db = get_db()
    courses = await db.courses.find().to_list(length=100)
    for course in courses:
        course["id"] = str(course.pop("_id"))
    return courses


@router.get("/{course_id}")
async def get_course(course_id: str):
    db = get_db()
    try:
        oid = ObjectId(course_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid course ID")
    course = await db.courses.find_one({"_id": oid})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course["id"] = str(course.pop("_id"))

    curriculum = await db.curricula.find_one({"course_id": course_id})
    if curriculum:
        curriculum["id"] = str(curriculum.pop("_id"))
        course["curriculum"] = curriculum

    return course


@router.get("/{course_id}/analysis")
async def get_course_analysis(course_id: str):
    db = get_db()

    course = await db.courses.find_one({"_id": ObjectId(course_id)})
    course_name = course["name"] if course else ""

    curriculum = await db.curricula.find_one({"course_id": course_id})
    curriculum_skills = curriculum.get("skills", []) if curriculum else []
    normalized_curriculum = curriculum.get("normalized_skills", curriculum_skills) if curriculum else []

    # Get skill gaps from precomputed collection
    gaps = await db.skill_gaps.find(
        {"course_id": course_id}
    ).sort("demand_frequency", -1).to_list(length=200)
    for gap in gaps:
        gap["id"] = str(gap.pop("_id"))

    # Get top demanded skills (global, for the comparison view)
    demanded_pipeline = [
        {"$match": {"normalized_skills.0": {"$exists": True}}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50},
    ]
    demanded_results = await db.jobs.aggregate(demanded_pipeline).to_list(length=50)
    demanded_skills = [{"skill": r["_id"], "count": r["count"]} for r in demanded_results]

    # Determine which curriculum skills are covered (appear in demand)
    demanded_set = {d["skill"].lower() for d in demanded_skills}
    gap_set = {g["skill_name"].lower() for g in gaps}

    covered = [s for s in normalized_curriculum if s.lower() in demanded_set]
    low_demand = [s for s in normalized_curriculum if s.lower() not in demanded_set]

    relevance_score = course.get("relevance_score") if course else None

    return {
        "course_id": course_id,
        "course_name": course_name,
        "relevance_score": relevance_score,
        "curriculum_skills": normalized_curriculum,
        "demanded_skills": demanded_skills,
        "covered_skills": covered,
        "low_demand_skills": low_demand,
        "skill_gaps": gaps,
    }
