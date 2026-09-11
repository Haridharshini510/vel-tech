"""
Phase 2/3: Normalize curriculum skills and compute skill gaps for each course.
Filters jobs by domain relevance before comparing.
Run: python compute_gaps.py
"""
import asyncio
import re
from collections import Counter

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.data.skill_dictionary import ALIAS_LOOKUP

COURSE_DOMAIN_KEYWORDS = {
    "Diploma in Computer Engineering": {
        "categories": ["IT Software", "IT Hardware", "Software Engineer", "Web", "Developer", "Programming"],
        "title_keywords": ["software", "developer", "engineer", "programmer", "web", "full stack",
                           "backend", "frontend", "devops", "cloud", "data", "it ", "python",
                           "java", "node", "react", ".net", "database", "sql", "system admin",
                           "technical", "application"],
    },
    "Diploma in Information Technology": {
        "categories": ["IT Software", "IT Hardware", "Web", "Developer", "Programming", "Software Engineer"],
        "title_keywords": ["software", "developer", "it ", "web", "full stack", "programmer",
                           "backend", "frontend", "devops", "cloud", "data", "technical support",
                           "system", "network", "database", "python", "java", "application",
                           "qa", "testing", "test"],
    },
    "Diploma in Electronics & Telecommunication": {
        "categories": ["Electronics", "Telecom", "Embedded", "Hardware", "IoT"],
        "title_keywords": ["electronics", "embedded", "telecom", "hardware", "iot", "vlsi",
                           "pcb", "circuit", "signal", "firmware", "microcontroller", "fpga",
                           "test engineer", "rf ", "wireless", "automation", "plc",
                           "instrumentation", "electrical"],
    },
    "Diploma in Mechanical Engineering": {
        "categories": ["Mechanical", "Manufacturing", "Production", "Automotive", "Design"],
        "title_keywords": ["mechanical", "manufacturing", "production", "design engineer",
                           "cad", "cam", "cnc", "auto", "quality", "maintenance",
                           "hvac", "piping", "welding", "tooling", "plant", "process"],
    },
    "Diploma in Civil Engineering": {
        "categories": ["Civil", "Construction", "Architecture", "Structural"],
        "title_keywords": ["civil", "construction", "structural", "site", "surveyor",
                           "architect", "estimation", "quantity", "building", "project",
                           "planning", "infrastructure", "autocad", "drafting"],
    },
}


def normalize_curriculum_skill(skill: str) -> str | None:
    key = skill.lower().strip()
    return ALIAS_LOOKUP.get(key)


def is_job_relevant(job: dict, domain_config: dict) -> bool:
    """Check if a job is relevant to a course domain."""
    category = (job.get("category") or "").lower()
    title = (job.get("title") or "").lower()

    for cat_kw in domain_config["categories"]:
        if cat_kw.lower() in category:
            return True

    for title_kw in domain_config["title_keywords"]:
        if title_kw.lower() in title:
            return True

    return False


async def compute():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.database_name]

    total_jobs = await db.jobs.count_documents({})
    print(f"Total jobs in database: {total_jobs}\n")

    # Load all jobs with just the fields we need for filtering and skill aggregation
    print("Loading jobs for domain filtering...")
    all_jobs = await db.jobs.find(
        {},
        {"title": 1, "category": 1, "normalized_skills": 1}
    ).to_list(length=10000)
    print(f"Loaded {len(all_jobs)} jobs.\n")

    await db.skill_gaps.delete_many({})

    courses = await db.courses.find().to_list(length=100)

    for course in courses:
        course_id = str(course["_id"])
        course_name = course["name"]
        print(f"=== {course_name} ===")

        domain_config = COURSE_DOMAIN_KEYWORDS.get(course_name)
        if not domain_config:
            print("  No domain config, skipping.\n")
            continue

        # Filter jobs relevant to this course
        relevant_jobs = [j for j in all_jobs if is_job_relevant(j, domain_config)]
        print(f"  Relevant jobs: {len(relevant_jobs)} / {len(all_jobs)}")

        if not relevant_jobs:
            print("  No relevant jobs found, skipping.\n")
            continue

        # Aggregate demanded skills from relevant jobs only
        demand = Counter()
        for job in relevant_jobs:
            for skill in job.get("normalized_skills", []):
                demand[skill] += 1

        # Get curriculum skills
        curriculum = await db.curricula.find_one({"course_id": course_id})
        if not curriculum:
            print("  No curriculum found, skipping.\n")
            continue

        raw_skills = curriculum.get("skills", [])
        normalized_curriculum = set()
        for skill in raw_skills:
            canonical = normalize_curriculum_skill(skill)
            if canonical:
                normalized_curriculum.add(canonical)
            else:
                normalized_curriculum.add(skill)

        await db.curricula.update_one(
            {"_id": curriculum["_id"]},
            {"$set": {"normalized_skills": sorted(normalized_curriculum)}},
        )

        # Filter demand to skills with meaningful count (>= 3 postings)
        significant_demand = {s: c for s, c in demand.items() if c >= 3}
        covered = normalized_curriculum & set(significant_demand.keys())
        gaps = set(significant_demand.keys()) - normalized_curriculum

        # Calculate relevance: weighted by demand count
        if significant_demand:
            weighted_covered = sum(significant_demand.get(s, 0) for s in covered)
            weighted_total = sum(significant_demand.values())
            relevance = round((weighted_covered / weighted_total) * 100, 1)
        else:
            relevance = 0

        await db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": {"relevance_score": relevance}},
        )

        print(f"  Curriculum skills: {len(normalized_curriculum)}")
        print(f"  Demanded skills (significant): {len(significant_demand)}")
        print(f"  Covered: {len(covered)}  |  Gaps: {len(gaps)}")
        print(f"  Relevance score: {relevance}%")

        # Store gaps
        gap_docs = []
        for skill in gaps:
            count = significant_demand[skill]
            if count >= 200:
                priority = "high"
            elif count >= 50:
                priority = "medium"
            else:
                priority = "low"

            gap_docs.append({
                "course_id": course_id,
                "skill_name": skill,
                "demand_frequency": count,
                "posting_count": count,
                "priority": priority,
            })

        gap_docs.sort(key=lambda x: x["demand_frequency"], reverse=True)

        if gap_docs:
            await db.skill_gaps.insert_many(gap_docs)

        print(f"  Stored {len(gap_docs)} gaps.\n")
        print(f"  Top 10 gaps:")
        for g in gap_docs[:10]:
            print(f"    {g['skill_name']:30s} {g['demand_frequency']:>5d} postings  [{g['priority']}]")
        print(f"\n  Covered skills:")
        for s in sorted(covered):
            print(f"    [OK] {s} ({significant_demand.get(s, 0)} postings)")
        print()

    total_gaps = await db.skill_gaps.count_documents({})
    print(f"\n=== Summary ===")
    print(f"Total skill gaps stored: {total_gaps}")
    print("Done!")

    client.close()


if __name__ == "__main__":
    asyncio.run(compute())
