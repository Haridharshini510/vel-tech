from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter

from app.core.database import get_db
from app.models.schemas import RoadmapRequest
from app.services.llm import generate_roadmap_llm, generate_roadmap_fallback

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


@router.post("/generate")
async def generate_roadmap(request: RoadmapRequest):
    db = get_db()

    if not request.regenerate:
        existing = await db.roadmaps.find_one({
            "course_id": request.course_id,
            "company_name": request.company_name,
            "role": request.role,
        })
        if existing:
            existing["id"] = str(existing.pop("_id"))
            return existing

    course = await db.courses.find_one({"_id": ObjectId(request.course_id)})
    if not course:
        return {"error": "Course not found"}

    curriculum = await db.curricula.find_one({"course_id": request.course_id})
    curriculum_skills = curriculum.get("normalized_skills", curriculum.get("skills", [])) if curriculum else []

    gaps = await db.skill_gaps.find(
        {"course_id": request.course_id}
    ).sort("demand_frequency", -1).to_list(length=50)

    if request.company_name and request.role:
        company_pipeline = [
            {"$match": {
                "company": {"$regex": f"^{request.company_name}$", "$options": "i"},
                "title": {"$regex": request.role, "$options": "i"},
            }},
            {"$unwind": "$normalized_skills"},
            {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        company_skills = await db.jobs.aggregate(company_pipeline).to_list(length=100)
        company_skill_set = {s["_id"].lower() for s in company_skills}
        curriculum_lower = {s.lower() for s in curriculum_skills}
        company_gaps = [
            {"skill_name": s["_id"], "posting_count": s["count"], "demand_frequency": s["count"], "priority": "high"}
            for s in company_skills
            if s["_id"].lower() not in curriculum_lower
        ]
        if company_gaps:
            gaps = company_gaps

    if not gaps:
        return {
            "course_id": request.course_id,
            "company_name": request.company_name,
            "role": request.role,
            "summary": "No skill gaps found — curriculum is well-aligned with demand.",
            "modules": [],
            "timeline": [],
            "resources": [],
            "capstone_projects": [],
            "source": "none",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    gap_dicts = []
    for g in gaps:
        gd = dict(g)
        gd.pop("_id", None)
        gap_dicts.append(gd)

    llm_result = await generate_roadmap_llm(
        course_name=course["name"],
        duration=course.get("duration", "3 years"),
        curriculum_skills=curriculum_skills,
        gaps=gap_dicts,
        company_name=request.company_name,
        role=request.role,
    )

    if llm_result:
        roadmap_data = llm_result
        source = "llm"
    else:
        roadmap_data = generate_roadmap_fallback(
            course_name=course["name"],
            curriculum_skills=curriculum_skills,
            gaps=gap_dicts,
            company_name=request.company_name,
            role=request.role,
        )
        source = "template"

    roadmap = {
        "course_id": request.course_id,
        "company_name": request.company_name,
        "role": request.role,
        "summary": roadmap_data.get("summary", ""),
        "modules": roadmap_data.get("modules", []),
        "timeline": roadmap_data.get("timeline", []),
        "resources": roadmap_data.get("resources", []),
        "capstone_projects": roadmap_data.get("capstone_projects", []),
        "skill_gaps_addressed": [g["skill_name"] for g in gap_dicts[:20]],
        "source": source,
        "generated_at": datetime.now(timezone.utc),
    }

    if request.regenerate:
        await db.roadmaps.delete_many({
            "course_id": request.course_id,
            "company_name": request.company_name,
            "role": request.role,
        })

    result = await db.roadmaps.insert_one(roadmap)
    roadmap["id"] = str(result.inserted_id)
    roadmap.pop("_id", None)
    roadmap["generated_at"] = roadmap["generated_at"].isoformat()

    return roadmap
