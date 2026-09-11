from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class JobBase(BaseModel):
    title: str
    company: str
    location: str
    description: str = ""
    source: str
    posted_date: Optional[datetime] = None
    raw_skills: list[str] = []
    normalized_skills: list[str] = []


class JobInDB(JobBase):
    id: str = Field(alias="_id")

    model_config = {"populate_by_name": True}


class JobResponse(JobBase):
    id: str


class SkillBase(BaseModel):
    canonical_name: str
    category: str = ""
    aliases: list[str] = []


class SkillInDB(SkillBase):
    id: str = Field(alias="_id")
    embedding: list[float] = []

    model_config = {"populate_by_name": True}


class CourseBase(BaseModel):
    name: str
    institution_type: str = ""
    duration: str = ""


class CourseResponse(CourseBase):
    id: str
    relevance_score: Optional[float] = None


class CurriculumBase(BaseModel):
    course_id: str
    subjects: list[dict] = []
    skills: list[str] = []
    source: str = ""
    version: str = "1.0"


class SkillGap(BaseModel):
    course_id: str
    skill_id: str
    skill_name: str
    demand_frequency: int = 0
    posting_count: int = 0
    priority: str = "medium"


class RoadmapRequest(BaseModel):
    course_id: str
    company_name: Optional[str] = None
    role: Optional[str] = None
    regenerate: bool = False


class RoadmapResponse(BaseModel):
    course_id: str
    skills: list[str] = []
    modules: list[dict] = []
    timeline: list[dict] = []
    resources: list[dict] = []
    projects: list[dict] = []
    generated_at: datetime


class StatsResponse(BaseModel):
    total_jobs: int
    total_companies: int
    total_skills: int
    total_courses: int


class TrendingSkillResponse(BaseModel):
    skill: str
    count: int
    category: str = ""
