#!/usr/bin/env bash
# Initialize OpenObserve streams and dashboards.
# Usage: ./scripts/init-observability.sh [OO_BASE_URL] [OO_USER] [OO_PASS]
#
# Defaults to env vars: OO_BASE_URL, OO_USER, OO_PASS, falling back to
# http://localhost:5080 / admin@futebol.local / Futebol@123

set -euo pipefail

OO_BASE_URL="${1:-${OO_BASE_URL:-http://localhost:5080}}"
OO_USER="${2:-${OO_USER:-admin@futebol.local}}"
OO_PASS="${3:-${OO_PASS:-Futebol@123}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARDS_DIR="${ROOT_DIR}/dashboards"

echo "=== Observability Init ==="
echo "OpenObserve: ${OO_BASE_URL}"

# ── 1. Ensure streams exist ──
STREAMS=(api_logs mcp_logs web_events)
for stream in "${STREAMS[@]}"; do
  echo "  Creating stream: ${stream}"
  curl -sf -u "${OO_USER}:${OO_PASS}" \
    -X PUT "${OO_BASE_URL}/api/${OO_USER}/streams/${stream}" \
    -H "Content-Type: application/json" \
    -d '{}' > /dev/null 2>&1 || true
  echo "    OK"
done

# ── 2. Import dashboards ──
echo "  Importing dashboards..."
python3 "${SCRIPT_DIR}/import_dashboards.py" --base-url "${OO_BASE_URL}" --user "${OO_USER}" --password "${OO_PASS}"

echo "=== Observability Init Complete ==="
