#!/usr/bin/env python3
"""Bump semver version in api/config.json and web/src/lib/version.ts.

Usage:
    python scripts/bump_version.py patch   # 1.0.1 → 1.0.2
    python scripts/bump_version.py minor   # 1.0.1 → 1.1.0
    python scripts/bump_version.py major   # 1.0.1 → 2.0.0
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_CONFIG = ROOT / "api" / "config.json"
WEB_VERSION = ROOT / "web" / "src" / "lib" / "version.ts"

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def read_version() -> str:
    data = json.loads(API_CONFIG.read_text())
    return data["version"]


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


def write_version(version: str) -> None:
    API_CONFIG.write_text(json.dumps({"version": version}, indent=2) + "\n")
    WEB_VERSION.write_text(f'export const VERSION = "{version}";\n')


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("patch", "minor", "major"):
        print(__doc__.strip(), file=sys.stderr)
        sys.exit(1)

    part = sys.argv[1]
    current = read_version()
    new = bump(current, part)
    write_version(new)
    print(f"version: {current} → {new}")


if __name__ == "__main__":
    main()
