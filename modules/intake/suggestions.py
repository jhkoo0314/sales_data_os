from __future__ import annotations

from modules.intake.fixers import normalize_header


def find_exact_header(headers: list[str], aliases: tuple[str, ...]) -> str | None:
    normalized_aliases = {normalize_header(alias) for alias in aliases}
    for header in headers:
        if normalize_header(header) in normalized_aliases:
            return header
    return None


def find_candidate_headers(headers: list[str], aliases: tuple[str, ...]) -> list[str]:
    normalized_aliases = [normalize_header(alias) for alias in aliases]
    candidates: list[str] = []
    for header in headers:
        normalized_header = normalize_header(header)
        if any(
            alias in normalized_header
            or normalized_header in alias
            or normalized_header.startswith(alias)
            or normalized_header.endswith(alias)
            for alias in normalized_aliases
        ):
            candidates.append(header)
    return list(dict.fromkeys(candidates))
