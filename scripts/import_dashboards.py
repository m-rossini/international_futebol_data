#!/usr/bin/env python3
"""
Import dashboard JSON definitions into OpenObserve via the REST API.

Usage:
    python scripts/import_dashboards.py [--base-url URL] [--user USER] [--password PASS]
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
import base64

BASE_URL = os.environ.get("OO_BASE_URL", "http://localhost:5080")
OO_USER = os.environ.get("OO_USER", "admin@futebol.local")
OO_PASS = os.environ.get("OO_PASS", "Futebol@123")


def _build_auth(user: str, password: str) -> str:
    return base64.b64encode(f"{user}:{password}".encode()).decode()


DASHBOARDS_DIR = os.path.join(os.path.dirname(__file__), "..", "dashboards")


def api_request(method, path, body=None):
    url = f"{BASE_URL}/api/default{path}"
    AUTH = _build_auth(OO_USER, OO_PASS)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {AUTH}",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()}")
        raise


GRID_COLUMNS = 12  # OpenObserve uses a 12-column grid


# Chart types that need x/y fields populated (checked by convertPanelData.ts)
CHART_TYPES_NEEDING_FIELDS = {
    "area", "area-stacked", "bar", "h-bar", "stacked", "heatmap",
    "h-stacked", "line", "pie", "donut", "scatter", "metric", "gauge",
}


def extract_sql_columns(sql: str):
    """Extract column aliases from a SELECT SQL query.

    Returns (x_fields, y_fields) lists of AxisItem-like dicts.
    Simple heuristic: columns ending in _num or aggregate fns → y-axis,
    everything else → x-axis.
    """
    # Normalise whitespace
    import re as _re

    # Try to extract the select list (everything between SELECT and FROM)
    sql_norm = sql.strip().replace("\n", " ")
    m = _re.search(r"select\s+(.*?)\s+from\s", sql_norm, _re.IGNORECASE)
    if not m:
        return [], []

    select_raw = m.group(1)
    # Split by top-level commas (not inside parentheses)
    parts = []
    depth = 0
    buf = ""
    for ch in select_raw:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(buf.strip())
            buf = ""
        else:
            buf += ch
    if buf.strip():
        parts.append(buf.strip())

    # Parse each column to extract label/alias
    x_fields = []
    y_fields = []

    for expr in parts:
        alias = None
        # Check for "as alias" pattern (case-insensitive)
        am = _re.search(r"\s+as\s+(\w+)$", expr, _re.IGNORECASE)
        if am:
            alias = am.group(1)
            col_expr = expr[: am.start()].strip()
        else:
            # No alias — use the raw expression as label
            alias = expr.split()[-1].strip('"`')
            col_expr = expr

        label = alias or col_expr.strip('"`')

        # Determine if this looks like a y-axis value
        is_y = False
        expr_lower = col_expr.lower().strip()
        if _re.match(r"(count|sum|avg|min|max|round|approx_percentile)", expr_lower):
            is_y = True
        elif alias and alias.endswith("_num"):
            is_y = True
        elif alias in ("zo_sql_num", "p50", "p95", "p99", "searches", "used",
                       "views", "sessions", "navigations", "visits", "cnt"):
            is_y = True

        axis_item = {
            "label": label,
            "alias": alias or label,
            "column": label,
            "type": "raw",
        }

        if is_y:
            y_fields.append(axis_item)
        else:
            x_fields.append(axis_item)

    return x_fields, y_fields


def make_panel(panel_def, idx, prev_panels=None):
    """Convert a simplified panel definition to the OpenObserve v8 format.

    Calculates proper x/y grid positions to avoid panel overlap.
    Populates x/y fields from SQL for chart types that require them.
    prev_panels is a list of (x, y, w, h) tuples for panels already placed
    in the current tab row.
    """
    panel_type = panel_def.get("type", "number")
    w = panel_def.get("w", 4)
    h = panel_def.get("h", 4)

    # Calculate x, y grid position
    x = 0
    y = 0
    if prev_panels:
        # Find the row position
        row_y = 0
        row_x = 0
        max_h_in_row = 0
        for px, py, pw, ph in prev_panels:
            if py > row_y:
                # New row
                row_y = py
                row_x = 0
                max_h_in_row = 0
            if py == row_y:
                row_x = px + pw
                max_h_in_row = max(max_h_in_row, ph)
                # Wrap to next row if doesn't fit
                if row_x + w > GRID_COLUMNS:
                    row_x = 0
                    row_y = row_y + max_h_in_row
                    max_h_in_row = h
        x = row_x
        y = row_y

    queries = []
    for q in panel_def.get("queries", []):
        sql = q.get("sql", "")
        stream_type = q.get("type", "logs")

        # Extract stream name from SQL
        stream = "web_events"
        for s in ["web_events", "api_logs"]:
            if f'"{s}"' in sql:
                stream = s
                break

        # Extract x/y fields from SQL for chart types that need them
        x_fields = []
        y_fields = []
        if panel_type in CHART_TYPES_NEEDING_FIELDS:
            x_fields, y_fields = extract_sql_columns(sql)
            # Ensure at least one field to avoid "Please select required fields"
            if not x_fields and not y_fields:
                y_fields.append({
                    "label": "zo_sql_num",
                    "alias": "zo_sql_num",
                    "column": "zo_sql_num",
                    "type": "raw",
                })

        query_obj = {
            "query": sql,
            "customQuery": True,
            "fields": {
                "stream": stream,
                "stream_type": stream_type,
                "x": x_fields,
                "y": y_fields,
                "filter": {
                    "filterType": "group",
                    "logicalOperator": "AND",
                    "conditions": [],
                },
            },
            "config": {
                "promql_legend": "",
            },
        }
        queries.append(query_obj)

    panel = {
        "id": f"panel{idx + 1}",
        "type": panel_type,
        "title": panel_def.get("title", ""),
        "description": panel_def.get("title", ""),
        "queryType": "sql",
        "config": {
            "show_legends": False,
        },
        "queries": queries,
        "layout": {
            "x": x,
            "y": y,
            "w": w,
            "h": h,
            "i": idx,
        },
    }

    return panel


def find_existing_dashboard(title):
    """Find an existing dashboard by title."""
    try:
        result = api_request("GET", "/dashboards")
        for d in result.get("dashboards", []):
            if d.get("title") == title:
                dashboard_id = d.get("dashboard_id")
                dash_hash = d.get("hash")
                print(f"  Found existing dashboard: {dashboard_id}")
                return dashboard_id, dash_hash
    except Exception as e:
        print(f"  Error listing dashboards: {e}")
    return None, None


def create_dashboard(title, description, tabs):
    """Create a new dashboard with empty tabs."""
    tabs_payload = []
    for t in tabs:
        tab_id = t.get("name", "Tab").lower().replace(" ", "-")
        tabs_payload.append({
            "tabId": tab_id,
            "name": t.get("name", "Tab"),
            "panels": [],
        })

    body = {
        "title": title,
        "description": description,
        "role": "",
        "tabs": tabs_payload,
    }

    result = api_request("POST", "/dashboards", body)
    v8 = result.get("v8", {})
    dashboard_id = v8.get("dashboardId") or result.get("dashboard_id")
    dash_hash = result.get("hash")
    return dashboard_id, dash_hash


def update_dashboard_panels(dashboard_id, dash_hash, title, description, tabs, tabs_def):
    """Update all tabs with their panels in a single PUT request."""
    tabs_payload = []
    for tab_def in tabs_def:
        tab_name = tab_def.get("name", "Tab")
        tab_id = tab_name.lower().replace(" ", "-")
        panels_def = tab_def.get("panels", [])

        v8_panels = []
        placed = []  # track placed panel positions for grid layout
        for pidx, p in enumerate(panels_def):
            panel = make_panel(p, pidx, placed)
            v8_panels.append(panel)
            placed.append((
                panel["layout"]["x"],
                panel["layout"]["y"],
                panel["layout"]["w"],
                panel["layout"]["h"],
            ))

        tabs_payload.append({
            "tabId": tab_id,
            "name": tab_name,
            "panels": v8_panels,
        })

    body = {
        "version": 8,
        "dashboardId": dashboard_id,
        "title": title,
        "description": description,
        "role": "",
        "owner": "admin@futebol.local",
        "tabs": tabs_payload,
    }

    result = api_request(
        "PUT",
        f"/dashboards/{dashboard_id}?hash={dash_hash}",
        body,
    )
    new_hash = result.get("hash", dash_hash)
    return new_hash


def create_or_update_dashboard(definition):
    """Create a dashboard with all panels, or update existing one."""
    title = definition["title"]
    description = definition.get("description", "")
    tabs_def = definition.get("tabs", [])

    print(f"\n{'='*60}")
    print(f"Dashboard: {title}")
    print(f"{'='*60}")

    # Check if dashboard already exists
    dashboard_id, dash_hash = find_existing_dashboard(title)

    if dashboard_id:
        print("  Updating existing dashboard...")
    else:
        print("  Creating new dashboard...")
        dashboard_id, dash_hash = create_dashboard(title, description, tabs_def)

    if not dashboard_id:
        print("  ERROR: Failed to get dashboard ID")
        return

    print(f"  Dashboard ID: {dashboard_id}")
    print(f"  Hash: {dash_hash}")

    # Build panel total count
    total_panels = sum(len(t.get("panels", [])) for t in tabs_def)
    print(f"  Total panels: {total_panels} across {len(tabs_def)} tab(s)")

    # Update all panels in one request
    new_hash = update_dashboard_panels(
        dashboard_id, dash_hash, title, description, tabs_def, tabs_def
    )
    print(f"  Updated. New hash: {new_hash}")
    print(f"  ✓ {title} — {total_panels} panels imported successfully")


def main():
    global BASE_URL, OO_USER, OO_PASS

    parser = argparse.ArgumentParser(description="Import dashboards into OpenObserve")
    parser.add_argument("--base-url", help="OpenObserve base URL (no /api/... suffix)")
    parser.add_argument("--user", help="OpenObserve username")
    parser.add_argument("--password", help="OpenObserve password")
    args = parser.parse_args()

    if args.base_url:
        BASE_URL = args.base_url
    if args.user:
        OO_USER = args.user
    if args.password:
        OO_PASS = args.password

    if not os.path.isdir(DASHBOARDS_DIR):
        print(f"Dashboards directory not found: {DASHBOARDS_DIR}")
        sys.exit(1)

    json_files = sorted([
        f for f in os.listdir(DASHBOARDS_DIR)
        if f.endswith(".json") and not f.startswith("_")
    ])

    if not json_files:
        print(f"No dashboard JSON files found in {DASHBOARDS_DIR}")
        sys.exit(1)

    print(f"Found {len(json_files)} dashboard definition(s):")
    for f in json_files:
        print(f"  - {f}")

    for fname in json_files:
        fpath = os.path.join(DASHBOARDS_DIR, fname)
        with open(fpath) as f:
            definition = json.load(f)
        create_or_update_dashboard(definition)
        time.sleep(0.5)

    print(f"\n{'='*60}")
    print("ALL DASHBOARDS IMPORTED SUCCESSFULLY")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
