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
# The OpenObserve org under which streams live. The ingest/user email is NOT
# the org — the org is "default" (matches NEXT_PUBLIC_OBS_ORG / the OTLP
# endpoint path /api/default). Using the email here silently created nothing.
OO_ORG="${OO_ORG:-default}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARDS_DIR="${ROOT_DIR}/dashboards"

echo "=== Observability Init ==="
echo "OpenObserve: ${OO_BASE_URL} (org: ${OO_ORG})"

# ── 1. Ensure streams exist ──
# OpenObserve only honours a stream definition — and therefore stops the
# compactor from discarding everything ingested into it — once its settings
# exist. On v1.0.4 that is PUT .../streams/<name>/settings; a plain PUT on
# .../streams/<name> answers 405. Combined with ZO_COMPACT_ENABLED=true, the
# stream then ingests normally (OTLP returns 200) and silently loses every
# record, so this step must fail loudly rather than be swallowed.
STREAMS=(api_logs mcp_logs web_events)
SETTINGS='{"retention_period": "30", "full_text_search_keys": []}'
CREATE='{"fields": [{"name": "body", "type": "Utf8"}], "settings": {"retention_period": "30", "full_text_search_keys": []}}'
STREAM_FAILURES=0

for stream in "${STREAMS[@]}"; do
  echo "  Defining stream: ${stream}"
  # Fast path: the stream already exists (ingest materialises it on first
  # write), so applying its settings is enough to define it.
  code=$(curl -s -o /dev/null -w '%{http_code}' \
    -u "${OO_USER}:${OO_PASS}" \
    -X PUT "${OO_BASE_URL}/api/${OO_ORG}/streams/${stream}/settings" \
    -H "Content-Type: application/json" \
    -d "${SETTINGS}" 2>/dev/null || echo "000")

  if [ "${code}" = "404" ]; then
    # Never ingested yet — create it with its definition in a single call.
    code=$(curl -s -o /dev/null -w '%{http_code}' \
      -u "${OO_USER}:${OO_PASS}" \
      -X POST "${OO_BASE_URL}/api/${OO_ORG}/streams/${stream}" \
      -H "Content-Type: application/json" \
      -d "${CREATE}" 2>/dev/null || echo "000")
  fi

  if [ "${code}" = "200" ]; then
    echo "    OK (HTTP ${code})"
  else
    echo "    FAILED (HTTP ${code})"
    STREAM_FAILURES=$((STREAM_FAILURES + 1))
  fi
done

# ── 2. Import dashboards ──
echo "  Importing dashboards..."
python3 "${SCRIPT_DIR}/import_dashboards.py" --base-url "${OO_BASE_URL}" --user "${OO_USER}" --password "${OO_PASS}"

# Reported last so dashboards are still provisioned when a stream fails.
if [ "${STREAM_FAILURES}" -gt 0 ]; then
  echo "ERROR: ${STREAM_FAILURES} stream(s) could not be defined. Logs will be" >&2
  echo "       ingested and then discarded by the compactor." >&2
  exit 1
fi

echo "=== Observability Init Complete ==="
