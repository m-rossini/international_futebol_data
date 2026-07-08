#!/usr/bin/env python3
"""Bump semver version in api/config.json and/or web/src/lib/version.ts.

Usage:
    python scripts/bump_version.py api patch   # Bump API only: 1.0.6 → 1.0.7
    python scripts/bump_version.py web minor   # Bump WEB only: 1.0.6 → 1.1.0
    python scripts/bump_version.py both major  # Bump both:     1.0.6 → 2.0.0
    python scripts/bump_version.py patch       # Backward compat: bumps both
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_CONFIG = ROOT / "api" / "config.json"
WEB_VERSION = ROOT / "web" / "src" / "lib" / "version.ts"

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def read_api_version() -> str:
    data = json.loads(API_CONFIG.read_text())
    return data["version"]


def read_web_version() -> str:
    content = WEB_VERSION.read_text()
    m = re.search(r"VERSION\s*=\s*['\"]([^'\"]+)['\"]", content)
    if not m:
        raise ValueError(f"Could not parse version from {WEB_VERSION}")
    return m.group(1)


def bump(version: str, part: str) -> str:
    m = SEMVER_RE.match(version)
    if not m:
        raise ValueError(f"Invalid semver: {version}")
    major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if part == "patch":
        patch += 1
    elif part == "minor":
        minor += 1
        patch = 0
    elif part == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise ValueError(f"Unknown bump part: {part}")
    return f"{major}.{minor}.{patch}"


def write_api_version(version: str) -> None:
    API_CONFIG.write_text(json.dumps({"version": version}, indent=2) + "\n")


def write_web_version(version: str) -> None:
    WEB_VERSION.write_text(f"export const VERSION = '{version}';\n")


def main() -> None:
    valid_targets = ("api", "web", "both")
    valid_parts = ("patch", "minor", "major")

    # Parse arguments: support both formats
    # New: target part (e.g., "api patch")
    # Legacy: part only (e.g., "patch") - defaults to "both"
    if len(sys.argv) == 2 and sys.argv[1] in valid_parts:
        target = "both"
        part = sys.argv[1]
    elif len(sys.argv) == 3 and sys.argv[1] in valid_targets and sys.argv[2] in valid_parts:
        target = sys.argv[1]
        part = sys.argv[2]
    else:
        print(__doc__.strip(), file=sys.stderr)
        sys.exit(1)

    results = []

    if target in ("api", "both"):
        current = read_api_version()
        new = bump(current, part)
        write_api_version(new)
        results.append(f"api: {current} → {new}")

    if target in ("web", "both"):
        current = read_web_version()
        new = bump(current, part)
        write_web_version(new)
        results.append(f"web: {current} → {new}")

    print("\n".join(results))


if __name__ == "__main__":
    main()
