"""Releases endpoint — fetch GitHub releases for the project."""

import logging
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

from football_stats.stats.models import ReleaseListItem, ReleaseDetailResponse

logger = logging.getLogger("stats.server.releases")

router = APIRouter(tags=["Releases"])

GITHUB_API = "https://api.github.com/repos/m-rossini/international_futebol_data"
CACHE_TTL = 300  # 5 minutes

_releases_cache: Optional[list[dict]] = None
_releases_cache_time: float = 0


def _fetch_releases_from_github() -> list[dict]:
    """Fetch releases from GitHub API with simple caching."""
    global _releases_cache, _releases_cache_time

    now = time.time()
    if _releases_cache is not None and (now - _releases_cache_time) < CACHE_TTL:
        return _releases_cache

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                f"{GITHUB_API}/releases",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            resp.raise_for_status()
            _releases_cache = resp.json()
            _releases_cache_time = now
            return _releases_cache
    except Exception as e:
        logger.warning("Failed to fetch releases from GitHub: %s", e)
        if _releases_cache is not None:
            return _releases_cache
        return []


@router.get("/releases", response_model=list[ReleaseListItem])
async def list_releases():
    """Return all GitHub releases for the project, newest first."""
    raw = _fetch_releases_from_github()
    results = []
    for r in raw:
        tag = r.get("tag_name", "")
        version = tag.lstrip("v") if tag.startswith("v") else tag
        results.append(
            ReleaseListItem(
                version=version,
                tag=tag,
                name=r.get("name", ""),
                published_at=r.get("published_at", ""),
                author=r.get("author", {}).get("login", "unknown"),
                body=r.get("body", ""),
                html_url=r.get("html_url", ""),
            )
        )
    return results


@router.get("/releases/{version}", response_model=ReleaseDetailResponse)
async def get_release(version: str):
    """Return details for a specific release by version number (e.g. 1.1.0)."""
    tag = f"v{version}" if not version.startswith("v") else version
    raw = _fetch_releases_from_github()

    for r in raw:
        if r.get("tag_name") == tag:
            body = r.get("body", "")
            return ReleaseDetailResponse(
                version=version,
                tag=tag,
                name=r.get("name", ""),
                published_at=r.get("published_at", ""),
                author=r.get("author", {}).get("login", "unknown"),
                body=body,
                html_url=r.get("html_url", ""),
            )

    raise HTTPException(status_code=404, detail=f"Release {version} not found")
