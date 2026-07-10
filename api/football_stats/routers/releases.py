"""Releases endpoint — read from local releases/ directory."""

import logging
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException

from football_stats.stats.models import ReleaseListItem, ReleaseDetailResponse

logger = logging.getLogger("stats.server.releases")

router = APIRouter(tags=["Releases"])


def _get_releases_dir() -> Path:
    """Find releases/ directory, works both locally and in Docker.

    From ``routers/`` directory:
      Local: 3 up → project root → releases/
      Docker: 2 up → /app/ → releases/
    """
    here = Path(__file__).resolve().parent

    local = here.parent.parent.parent / "releases"
    if local.exists():
        return local

    docker = here.parent.parent / "releases"
    if docker.exists():
        return docker

    return local  # fallback — caller handles existence check


def _parse_version(version_str: str) -> tuple:
    """Parse version string into tuple for sorting (major, minor, patch)."""
    match = re.match(r"(\d+)\.(\d+)\.(\d+)", version_str)
    if match:
        return (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    return (0, 0, 0)


def _parse_markdown_file(filepath: Path) -> Optional[dict]:
    """Parse a markdown release file into a dictionary."""
    try:
        content = filepath.read_text(encoding="utf-8")
        filename = filepath.stem  # e.g., "api-v1.0.0"

        # Extract component and version from filename
        # e.g., "api-v1.0.0" -> component="api", version="1.0.0"
        parts = filename.split("-v", 1)
        if len(parts) != 2:
            return None
        component, version = parts
        tag = f"{component}-v{version}"

        # Parse markdown content
        lines = content.strip().split("\n")
        name = ""
        published_at = ""
        body_lines = []
        in_changes = False

        for line in lines:
            if line.startswith("# "):
                name = line[2:].strip()
            elif line.startswith("**Released:**"):
                published_at = line.replace("**Released:**", "").strip()
            elif line.startswith("## Changes"):
                in_changes = True
            elif in_changes and line.startswith("- "):
                body_lines.append(line[2:].strip())

        body = "\n".join(f"- {item}" for item in body_lines)

        return {
            "version": version,
            "tag": tag,
            "name": name,
            "published_at": published_at,
            "author": "m-rossini",
            "body": body,
            "html_url": f"https://github.com/m-rossini/international_futebol_data/releases/tag/{tag}",
            "component": component,
        }
    except Exception as e:
        logger.warning("Failed to parse release file %s: %s", filepath, e)
        return None


def _load_all_releases() -> list[dict]:
    """Load all releases from the releases/ directory."""
    releases_dir = _get_releases_dir()
    if not releases_dir.exists():
        logger.warning("Releases directory not found: %s", releases_dir)
        return []

    releases = []
    for filepath in releases_dir.glob("*.md"):
        release = _parse_markdown_file(filepath)
        if release:
            releases.append(release)

    # Sort by version number (newest first)
    releases.sort(
        key=lambda r: _parse_version(r["version"]),
        reverse=True,
    )

    return releases


@router.get("/releases", response_model=list[ReleaseListItem])
async def list_releases():
    """Return all releases from local files, newest first."""
    raw = _load_all_releases()
    results = []
    for r in raw:
        results.append(
            ReleaseListItem(
                version=r["version"],
                tag=r["tag"],
                name=r["name"],
                published_at=r["published_at"],
                author=r["author"],
                body=r["body"],
                html_url=r["html_url"],
            )
        )
    return results


@router.get("/releases/{version}", response_model=ReleaseDetailResponse)
async def get_release(version: str):
    """Return details for a specific release by version number (e.g. 1.1.0)."""
    raw = _load_all_releases()

    # Try to find by version with any component prefix
    for r in raw:
        if r["version"] == version:
            return ReleaseDetailResponse(
                version=r["version"],
                tag=r["tag"],
                name=r["name"],
                published_at=r["published_at"],
                author=r["author"],
                body=r["body"],
                html_url=r["html_url"],
            )

    raise HTTPException(status_code=404, detail=f"Release {version} not found")
