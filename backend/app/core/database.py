import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri, tlsCAFile=certifi.where())
    db = client[settings.database_name]

    await db.jobs.create_index("company")
    await db.jobs.create_index("location")
    await db.jobs.create_index("source")
    await db.jobs.create_index("posted_date")
    await db.jobs.create_index("normalized_skills")
    await db.jobs.create_index("adzuna_id", sparse=True)
    await db.jobs.create_index("category")
    await db.jobs.create_index([("title", "text"), ("company", "text")])
    await db.skill_gaps.create_index("course_id")
    await db.skill_gaps.create_index([("course_id", 1), ("demand_frequency", -1)])
    await db.roadmaps.create_index([("course_id", 1), ("company_name", 1), ("role", 1)])
    await db.districts.create_index("id", unique=True)
    await db.districts.create_index("region")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
