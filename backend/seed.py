"""Seed the database with Naukri job data + curriculum data. Run once: python seed.py"""
import asyncio
import csv
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.data.seed_curricula import COURSES, CURRICULA

NAUKRI_CSV = "../data/naukri_jobs.csv"


def parse_naukri_csv():
    jobs = []
    with open(NAUKRI_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            posted_date = None
            if row.get("post_date"):
                try:
                    posted_date = datetime.strptime(row["post_date"], "%Y-%m-%d")
                except ValueError:
                    pass

            cities = row.get("city", "")
            location = row.get("inferred_city") or (cities.split("|")[0] if cities else "")
            state = row.get("inferred_state") or row.get("state", "")

            if location and state:
                location = f"{location}, {state}"
            elif state:
                location = state

            job = {
                "title": row.get("job_title", "").strip(),
                "company": row.get("company_name", "").strip(),
                "location": location.strip(),
                "description": row.get("job_description", "").strip(),
                "category": row.get("category", "").strip(),
                "source": "naukri",
                "posted_date": posted_date,
                "salary": row.get("salary_offered", "").strip(),
                "job_type": row.get("job_type", "").strip(),
                "raw_skills": [],
                "normalized_skills": [],
            }

            if job["title"] and job["company"]:
                jobs.append(job)

    return jobs


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.database_name]

    # --- Seed jobs ---
    print("Parsing Naukri CSV...")
    jobs = parse_naukri_csv()
    print(f"Parsed {len(jobs)} valid jobs.")

    existing_jobs = await db.jobs.count_documents({"source": "naukri"})
    if existing_jobs > 0:
        print(f"Found {existing_jobs} existing Naukri jobs. Clearing before re-seed...")
        await db.jobs.delete_many({"source": "naukri"})

    batch_size = 500
    for i in range(0, len(jobs), batch_size):
        batch = jobs[i:i + batch_size]
        await db.jobs.insert_many(batch)
        print(f"  Inserted jobs {i + 1} to {i + len(batch)}")

    print(f"Total jobs seeded: {len(jobs)}")

    # --- Create indexes ---
    print("Creating indexes...")
    await db.jobs.create_index("company")
    await db.jobs.create_index("location")
    await db.jobs.create_index("source")
    await db.jobs.create_index("posted_date")
    await db.jobs.create_index("normalized_skills")
    await db.jobs.create_index("category")

    # --- Seed courses + curricula ---
    await db.courses.delete_many({})
    await db.curricula.delete_many({})

    for course in COURSES:
        result = await db.courses.insert_one(course)
        course_id = str(result.inserted_id)
        print(f"Inserted course: {course['name']} ({course_id})")

        for curr in CURRICULA:
            if curr["course_name"] == course["name"]:
                curriculum_doc = {
                    "course_id": course_id,
                    "subjects": curr["subjects"],
                    "skills": curr["skills"],
                    "source": curr["source"],
                    "version": curr["version"],
                }
                await db.curricula.insert_one(curriculum_doc)
                print(f"  -> Curriculum: {len(curr['skills'])} skills")
                break

    print(f"\nSeeded {len(COURSES)} courses with curricula.")

    # --- Summary ---
    total_jobs = await db.jobs.count_documents({})
    total_companies = len(await db.jobs.distinct("company"))
    total_courses = await db.courses.count_documents({})
    print(f"\n--- Database Summary ---")
    print(f"Jobs:      {total_jobs}")
    print(f"Companies: {total_companies}")
    print(f"Courses:   {total_courses}")
    print("Done!")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
