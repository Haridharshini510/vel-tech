"""
Multi-stage skill matching pipeline:
  1. Exact match against canonical dictionary + aliases
  2. Fuzzy match using RapidFuzz
  3. Semantic match using sentence-transformers embeddings
"""
import numpy as np
from rapidfuzz import fuzz, process

from app.data.skill_dictionary import ALIAS_LOOKUP, ALL_CANONICAL_NAMES, SKILL_DICTIONARY

FUZZY_THRESHOLD = 82
SEMANTIC_THRESHOLD = 0.55

_embedder = None
_canonical_embeddings = None
_canonical_names_for_embed = None


def _get_embedder():
    global _embedder, _canonical_embeddings, _canonical_names_for_embed
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        _canonical_names_for_embed = ALL_CANONICAL_NAMES[:]
        _canonical_embeddings = _embedder.encode(_canonical_names_for_embed, normalize_embeddings=True)
    return _embedder, _canonical_embeddings, _canonical_names_for_embed


def exact_match(phrase: str) -> dict | None:
    key = phrase.lower().strip()
    if key in ALIAS_LOOKUP:
        return {
            "original": phrase,
            "canonical": ALIAS_LOOKUP[key],
            "method": "exact",
            "confidence": 1.0,
        }
    return None


def fuzzy_match(phrase: str) -> dict | None:
    all_terms = list(ALIAS_LOOKUP.keys())
    result = process.extractOne(
        phrase.lower().strip(),
        all_terms,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=FUZZY_THRESHOLD,
    )
    if result:
        matched_term, score, _ = result
        canonical = ALIAS_LOOKUP[matched_term]
        return {
            "original": phrase,
            "canonical": canonical,
            "method": "fuzzy",
            "confidence": round(score / 100, 2),
        }
    return None


def semantic_match(phrase: str) -> dict | None:
    embedder, canonical_embs, names = _get_embedder()
    phrase_emb = embedder.encode([phrase], normalize_embeddings=True)
    similarities = np.dot(canonical_embs, phrase_emb.T).flatten()
    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])

    if best_score >= SEMANTIC_THRESHOLD:
        return {
            "original": phrase,
            "canonical": names[best_idx],
            "method": "semantic",
            "confidence": round(best_score, 3),
        }
    return None


def resolve_skill(phrase: str) -> dict | None:
    """Run the full matching pipeline on a single phrase."""
    result = exact_match(phrase)
    if result:
        return result

    result = fuzzy_match(phrase)
    if result:
        return result

    result = semantic_match(phrase)
    if result:
        return result

    return None


def resolve_skills(phrases: list[str]) -> tuple[list[dict], list[str]]:
    """
    Resolve a list of extracted phrases to canonical skills.
    Returns (resolved_list, unresolved_list).
    """
    resolved = []
    unresolved = []
    seen_canonical = set()

    for phrase in phrases:
        result = resolve_skill(phrase)
        if result and result["canonical"] not in seen_canonical:
            seen_canonical.add(result["canonical"])
            resolved.append(result)
        elif not result:
            unresolved.append(phrase)

    return resolved, unresolved
