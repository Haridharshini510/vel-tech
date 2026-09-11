"""Adzuna API client for fetching live job postings."""
import httpx
from datetime import datetime

from app.core.config import settings

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/in/search/{page}"

SEARCH_KEYWORDS = [
    "software developer",
    "data analyst",
    "web developer",
    "devops engineer",
    "cloud engineer",
    "python developer",
    "java developer",
    "full stack developer",
    "mechanical engineer",
    "civil engineer",
    "electronics engineer",
    "network engineer",
    "QA tester",
    "project manager",
    "business analyst",
]


async def fetch_jobs(page: int = 1, results_per_page: int = 50, what: str = "", where: str = "India") -> list[dict]:
    """Fetch jobs from Adzuna API and normalize to our schema."""
    url = ADZUNA_BASE_URL.format(page=page)
    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": results_per_page,
    }
    if what:
        params["what"] = what
    if where:
        params["where"] = where

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    results = data.get("results", [])
    jobs = []

    for item in results:
        posted_date = None
        if item.get("created"):
            try:
                posted_date = datetime.fromisoformat(item["created"].replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        location = ""
        loc = item.get("location", {})
        if loc.get("display_name"):
            location = loc["display_name"]

        job = {
            "title": (item.get("title") or "").strip(),
            "company": (item.get("company", {}).get("display_name") or "").strip(),
            "location": location,
            "description": (item.get("description") or "").strip(),
            "category": (item.get("category", {}).get("label") or "").strip(),
            "source": "adzuna",
            "posted_date": posted_date,
            "salary": "",
            "job_type": (item.get("contract_type") or "").strip(),
            "raw_skills": [],
            "normalized_skills": [],
            "adzuna_id": str(item.get("id", "")),
            "redirect_url": item.get("redirect_url", ""),
        }

        if item.get("salary_min") and item.get("salary_max"):
            job["salary"] = f"₹ {int(item['salary_min'])}-{int(item['salary_max'])}"

        if job["title"] and job["company"]:
            jobs.append(job)

    return jobs


async def fetch_multiple_pages(pages: int = 2, what: str = "", where: str = "India") -> list[dict]:
    """Fetch multiple pages of jobs for a single keyword."""
    all_jobs = []
    for page in range(1, pages + 1):
        try:
            jobs = await fetch_jobs(page=page, what=what, where=where)
            all_jobs.extend(jobs)
        except Exception as e:
            print(f"  Error fetching page {page} for '{what}': {e}")
            break
    return all_jobs


async def fetch_broad(keywords: list[str] = None, pages_per_keyword: int = 1) -> list[dict]:
    """Fetch jobs across multiple search keywords for broader coverage."""
    if keywords is None:
        keywords = SEARCH_KEYWORDS

    all_jobs = []
    seen_ids = set()

    for kw in keywords:
        jobs = await fetch_multiple_pages(pages=pages_per_keyword, what=kw)
        for job in jobs:
            key = f"{job['title']}|{job['company']}|{job.get('adzuna_id', '')}"
            if key not in seen_ids:
                seen_ids.add(key)
                all_jobs.append(job)

    return all_jobs
