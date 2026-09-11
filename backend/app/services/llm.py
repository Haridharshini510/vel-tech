import json
import httpx

from app.core.config import settings

SYSTEM_PROMPT = """You are an expert curriculum advisor for Indian polytechnic/diploma institutions.
You generate structured training roadmaps to bridge skill gaps between current curricula and employer demand.

Your roadmaps must be:
- Practical and achievable within the given course duration
- Prioritized by employer demand (highest-demand gaps first)
- Include free/affordable resources accessible in India
- Include hands-on capstone projects that demonstrate competency

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code fences, no explanation text."""

ROADMAP_SCHEMA = """{
  "summary": "1-2 sentence overview of the roadmap",
  "modules": [
    {
      "title": "Module title",
      "description": "What students will learn",
      "skills": ["skill1", "skill2"],
      "duration_weeks": 2,
      "topics": ["topic1", "topic2", "topic3"],
      "learning_outcomes": ["outcome1", "outcome2"]
    }
  ],
  "timeline": [
    {
      "week": 1,
      "module": "Module title",
      "activities": ["activity1", "activity2"],
      "milestone": "What students should achieve by end of week"
    }
  ],
  "resources": [
    {
      "module": "Module title",
      "items": [
        {"title": "Resource name", "type": "course|video|documentation|tutorial", "platform": "Platform name", "free": true}
      ]
    }
  ],
  "capstone_projects": [
    {
      "title": "Project title",
      "description": "What the project involves",
      "skills_covered": ["skill1", "skill2"],
      "difficulty": "beginner|intermediate|advanced",
      "duration_weeks": 2
    }
  ]
}"""


def _build_prompt(course_name: str, duration: str, curriculum_skills: list[str],
                  gaps: list[dict], company_name: str | None, role: str | None) -> str:
    gap_text = "\n".join(
        f"  {i+1}. {g['skill_name']} — {g.get('posting_count', g.get('demand_frequency', 0))} job postings, priority: {g.get('priority', 'medium')}"
        for i, g in enumerate(gaps[:20])
    )

    prompt = f"""Generate a training roadmap for the following course:

COURSE: {course_name}
DURATION: {duration}
CURRENT CURRICULUM SKILLS: {', '.join(curriculum_skills)}

SKILL GAPS (ranked by employer demand):
{gap_text}
"""

    if company_name:
        prompt += f"\nTARGET COMPANY: {company_name}"
    if role:
        prompt += f"\nTARGET ROLE: {role}"

    prompt += f"""

Generate a roadmap that:
1. Creates 4-6 training modules covering the top skill gaps
2. Provides a week-by-week timeline (total 8-12 weeks)
3. Lists free learning resources for each module (NPTEL, freeCodeCamp, YouTube, official docs)
4. Includes 4 capstone projects of increasing difficulty
5. Prioritizes high-demand skills first

Respond with ONLY this JSON structure:
{ROADMAP_SCHEMA}"""

    return prompt


async def generate_roadmap_llm(course_name: str, duration: str, curriculum_skills: list[str],
                                gaps: list[dict], company_name: str | None = None,
                                role: str | None = None) -> dict | None:
    if not settings.llm_api_key:
        return None

    prompt = _build_prompt(course_name, duration, curriculum_skills, gaps, company_name, role)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000,
                },
            )
            response.raise_for_status()
            data = response.json()

            content = data["choices"][0]["message"]["content"]
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1] if "\n" in content else content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

            return json.loads(content)

    except Exception as e:
        print(f"LLM API error: {e}")
        return None


def generate_roadmap_fallback(course_name: str, curriculum_skills: list[str],
                               gaps: list[dict], company_name: str | None = None,
                               role: str | None = None) -> dict:
    top_gaps = gaps[:20]

    chunk_size = max(1, len(top_gaps) // 4) if len(top_gaps) >= 4 else max(1, len(top_gaps))
    modules = []
    for i in range(0, len(top_gaps), chunk_size):
        chunk = top_gaps[i:i+chunk_size]
        if not chunk:
            break
        skill_names = [g["skill_name"] for g in chunk]
        mod_num = len(modules) + 1
        modules.append({
            "title": f"Module {mod_num}: {' & '.join(skill_names[:2])}{'...' if len(skill_names) > 2 else ''}",
            "description": f"Build proficiency in {', '.join(skill_names)} through hands-on practice and projects",
            "skills": skill_names,
            "duration_weeks": 2,
            "topics": [f"{s} fundamentals" for s in skill_names[:3]] + [f"{s} practical application" for s in skill_names[:2]],
            "learning_outcomes": [
                f"Understand core concepts of {skill_names[0]}",
                f"Apply {skill_names[0]} in real-world scenarios",
            ],
        })
        if len(modules) >= 6:
            break

    timeline = []
    week = 1
    for mod in modules:
        for w in range(mod["duration_weeks"]):
            timeline.append({
                "week": week,
                "module": mod["title"],
                "activities": [
                    f"Study {mod['skills'][0]} concepts" if w == 0 else f"Practice {mod['skills'][0]} exercises",
                    "Complete hands-on lab assignments",
                ],
                "milestone": f"Complete {'theory' if w == 0 else 'practical'} portion of {mod['title']}",
            })
            week += 1

    resources = []
    for mod in modules:
        items = []
        for skill in mod["skills"][:3]:
            items.extend([
                {"title": f"{skill} - Complete Tutorial", "type": "course", "platform": "freeCodeCamp", "free": True},
                {"title": f"{skill} Documentation", "type": "documentation", "platform": "Official Docs", "free": True},
            ])
        resources.append({"module": mod["title"], "items": items})

    all_skills = [g["skill_name"] for g in top_gaps]
    target = f" for {company_name}" if company_name else ""
    role_text = f" ({role})" if role else ""
    projects = [
        {
            "title": f"Portfolio Website with {all_skills[0] if all_skills else 'Modern Tech'}",
            "description": f"Build a responsive portfolio showcasing{target}{role_text} skills using {', '.join(all_skills[:3])}",
            "skills_covered": all_skills[:3],
            "difficulty": "beginner",
            "duration_weeks": 1,
        },
        {
            "title": f"Data Dashboard Application",
            "description": f"Create an interactive dashboard that visualizes industry data using {', '.join(all_skills[1:4])}",
            "skills_covered": all_skills[1:4] or all_skills[:3],
            "difficulty": "intermediate",
            "duration_weeks": 2,
        },
        {
            "title": f"Full-Stack {role or 'Industry'} Tool",
            "description": f"Build a complete application solving a real problem using {', '.join(all_skills[:5])}",
            "skills_covered": all_skills[:5],
            "difficulty": "intermediate",
            "duration_weeks": 2,
        },
        {
            "title": f"Capstone: {course_name} Industry Project",
            "description": f"End-to-end project combining all learned skills{target}{role_text}, presented with documentation",
            "skills_covered": all_skills[:8],
            "difficulty": "advanced",
            "duration_weeks": 3,
        },
    ]

    summary = f"A {len(timeline)}-week training roadmap to bridge {len(top_gaps)} skill gaps in {course_name}"
    if company_name:
        summary += f", aligned with {company_name}{role_text} requirements"

    return {
        "summary": summary,
        "modules": modules,
        "timeline": timeline,
        "resources": resources,
        "capstone_projects": projects,
    }
