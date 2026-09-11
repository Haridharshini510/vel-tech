"""Extract candidate skill phrases from job descriptions and titles."""
import re

from app.data.skill_dictionary import ALIAS_LOOKUP, ALL_CANONICAL_NAMES


def _clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_from_structured_skills(raw_skills: list[str]) -> list[str]:
    """Extract from pre-parsed skill fields."""
    phrases = []
    for skill in raw_skills:
        for part in re.split(r"[,;|/]", skill):
            part = part.strip()
            if 2 <= len(part) <= 60:
                phrases.append(part)
    return phrases


_SKILL_PATTERNS = [
    re.compile(r"(?:experience|expertise|proficiency|knowledge|skilled|hands[- ]on)\s+(?:in|with|on|of)\s+([A-Za-z0-9\s\+\#\./\-]{2,40})", re.IGNORECASE),
    re.compile(r"(?:proficient|familiar|competent)\s+(?:in|with)\s+([A-Za-z0-9\s\+\#\./\-]{2,40})", re.IGNORECASE),
    re.compile(r"(?:skills?|technologies?|tools?|platforms?)\s*[:]\s*([A-Za-z0-9\s\+\#\./,\-]{2,200})", re.IGNORECASE),
]


def _extract_from_text_patterns(text: str) -> list[str]:
    """Extract skill phrases using regex patterns."""
    phrases = []
    for pattern in _SKILL_PATTERNS:
        for match in pattern.finditer(text):
            raw = match.group(1)
            for part in re.split(r"[,;|]", raw):
                part = part.strip().rstrip(".")
                if 2 <= len(part) <= 50:
                    phrases.append(part)
    return phrases


def _extract_known_skills(text: str) -> list[str]:
    """Scan text for known canonical skills and aliases."""
    text_lower = text.lower()
    found = []
    for term, canonical in ALIAS_LOOKUP.items():
        if len(term) <= 2:
            pattern = r"\b" + re.escape(term) + r"\b"
            if re.search(pattern, text_lower):
                found.append(term)
        else:
            if term in text_lower:
                found.append(term)
    return found


def extract_skills(title: str, description: str, raw_skills: list[str] = None) -> list[str]:
    """
    Extract all candidate skill phrases from a job posting.
    Returns deduplicated list of raw extracted phrases.
    """
    all_phrases = []

    if raw_skills:
        all_phrases.extend(_extract_from_structured_skills(raw_skills))

    text = _clean_text(f"{title}. {description}")
    all_phrases.extend(_extract_from_text_patterns(text))
    all_phrases.extend(_extract_known_skills(text))

    seen = set()
    unique = []
    for phrase in all_phrases:
        key = phrase.lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(phrase)

    return unique
