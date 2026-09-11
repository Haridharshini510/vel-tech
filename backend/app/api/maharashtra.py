from fastapi import APIRouter, Query

from app.core.database import get_db

router = APIRouter(prefix="/maharashtra", tags=["Maharashtra Intelligence"])


@router.get("/districts")
async def get_districts(layer: str = None):
    """Return all 36 districts with indicators. If the jobs collection has data,
    enrich employment and skills indicators with live numbers."""
    db = get_db()

    districts = await db.districts.find({}, {"_id": 0}).to_list(length=50)
    if not districts:
        return []

    total_jobs = await db.jobs.count_documents({})
    live = total_jobs > 0

    if live:
        location_job_counts = {}
        pipeline = [
            {"$match": {"location": {"$ne": ""}}},
            {"$group": {"_id": "$location", "count": {"$sum": 1}}},
        ]
        results = await db.jobs.aggregate(pipeline).to_list(length=500)
        for r in results:
            loc = r["_id"].lower()
            location_job_counts[loc] = r["count"]

        total_skills = await db.skills.count_documents({})
        total_gaps = await db.skill_gaps.count_documents({})

        for d in districts:
            name_lower = d["name"].lower()
            job_count = 0
            for loc_key, cnt in location_job_counts.items():
                if name_lower in loc_key or loc_key in name_lower:
                    job_count += cnt
            if job_count > 0:
                demand_idx = min(95, int((job_count / max(total_jobs, 1)) * 1000))
                d["indicators"]["employment"]["jobDemandIndex"] = max(
                    d["indicators"]["employment"]["jobDemandIndex"], demand_idx
                )
            d.setdefault("live_enrichment", {})
            d["live_enrichment"]["total_jobs"] = total_jobs
            d["live_enrichment"]["district_jobs"] = job_count
            d["live_enrichment"]["total_skills_mapped"] = total_skills
            d["live_enrichment"]["total_gaps"] = total_gaps

    return districts


@router.get("/districts/{district_id}")
async def get_district(district_id: str):
    """Single district with full detail + live skill enrichment."""
    db = get_db()

    district = await db.districts.find_one({"id": district_id}, {"_id": 0})
    if not district:
        return {"error": "District not found"}

    total_jobs = await db.jobs.count_documents({})
    if total_jobs > 0:
        name_lower = district["name"].lower()
        pipeline = [
            {"$match": {"location": {"$regex": name_lower, "$options": "i"}}},
            {"$match": {"normalized_skills.0": {"$exists": True}}},
            {"$unwind": "$normalized_skills"},
            {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 15},
        ]
        top_skills = await db.jobs.aggregate(pipeline).to_list(length=15)
        district["top_demanded_skills"] = [
            {"skill": s["_id"], "count": s["count"]} for s in top_skills
        ]

        district_jobs = await db.jobs.count_documents(
            {"location": {"$regex": name_lower, "$options": "i"}}
        )
        district["live_enrichment"] = {
            "total_jobs": total_jobs,
            "district_jobs": district_jobs,
        }

    return district


@router.get("/summary")
async def get_maharashtra_summary():
    """Overview stats for the map page."""
    db = get_db()

    district_count = await db.districts.count_documents({})
    total_jobs = await db.jobs.count_documents({})
    total_skills = await db.skills.count_documents({})

    districts = await db.districts.find(
        {}, {"indicators": 1, "population": 1, "_id": 0}
    ).to_list(length=50)

    total_youth = sum(d.get("population", {}).get("youth", 0) for d in districts)

    return {
        "total_districts": district_count,
        "total_youth_population": total_youth,
        "total_jobs_analyzed": total_jobs,
        "total_skills_mapped": total_skills,
        "data_sources": [
            "UDISE+ (Education)",
            "NFHS-5 (Health & Social)",
            "Census 2011 (Demographics)",
            "Maharashtra Economic Survey",
            "MSSDS / Mahaswayam (Skills & Employment)",
            "IndustryPulse Job Pipeline (Live)",
        ],
    }
