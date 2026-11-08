#!/usr/bin/env python3
"""
Download StatsBomb match data and lineup data for matches that exist in our results.csv.
Converts to squads.csv format.
"""

import json
import csv
import os
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
RAW_BASE = "https://raw.githubusercontent.com/hudl/open-data/master/data"
GITHUB_API_BASE = "https://api.github.com/repos/hudl/open-data/contents/data"
OUT_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "squads.csv")
RESULTS_CSV = "/home/perez/projetos/international_results/results.csv"
MAX_WORKERS = 10

def fetch_json(url):
    """Fetch JSON from a URL."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return None

def get_match_files(comp_id):
    """Get list of match JSON files for a competition."""
    url = f"{GITHUB_API_BASE}/matches/{comp_id}?ref=master"
    data = fetch_json(url)
    if not data:
        return []
    return [item["name"] for item in data if item["type"] == "file" and item["name"].endswith(".json")]

def load_results():
    """Load existing results.csv into a lookup dict."""
    results = {}
    with open(RESULTS_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row["date"], row["home_team"], row["away_team"])
            results[key] = row
    return results

def process_match(comp_id, filename, results_lookup):
    """Download and process a single match file."""
    url = f"{RAW_BASE}/matches/{comp_id}/{filename}"
    data = fetch_json(url)
    if not data:
        return []

    squads = []
    for match in data:
        match_id = match.get("match_id")
        match_date = match.get("match_date")
        home_team = match.get("home_team", {}).get("home_team_name", "")
        away_team = match.get("away_team", {}).get("away_team_name", "")

        # Check if this match exists in our results
        key = (match_date, home_team, away_team)
        if key not in results_lookup:
            key_rev = (match_date, away_team, home_team)
            if key_rev not in results_lookup:
                continue

        # Download lineup for this match
        lineup_url = f"{RAW_BASE}/lineups/{match_id}.json"
        lineup_data = fetch_json(lineup_url)
        if not lineup_data:
            continue

        # Extract squad info from lineup
        for team_entry in lineup_data:
            team_name = team_entry.get("team_name", "")
            lineup_players = team_entry.get("lineup", [])

            for player in lineup_players:
                positions = player.get("positions", [])
                is_starter = "FALSE"
                if positions:
                    # Check if any position has a position_id (meaning they played)
                    is_starter = "TRUE" if any(p.get("position_id") for p in positions) else "FALSE"

                all_squads.append({
                    "match_date": match_date,
                    "home_team": home_team,
                    "away_team": away_team,
                    "team": team_name,
                    "player_name": player.get("player_name", ""),
                    "shirt_no": str(player.get("jersey_number", "")),
                    "position": positions[0].get("position", "") if positions else "",
                    "starter": is_starter,
                    "captain": "FALSE",
                })

    return all_squads

def main():
    # Load existing results.csv
    print("Loading results.csv...")
    results_lookup = load_results()
    print(f"Loaded {len(results_lookup)} matches from results.csv")

    # Get competition directories
    print("Fetching competition directories...")
    comp_url = f"{GITHUB_API_BASE}/matches?ref=master"
    comp_data = fetch_json(comp_url)
    if not comp_data:
        print("Failed to get competition list")
        return

    comp_dirs = [item["name"] for item in comp_data if item["type"] == "dir"]
    print(f"Found {len(comp_dirs)} competition directories: {comp_dirs}")

    all_squads = []
    total_matches_found = 0
    total_match_files = 0

    for comp_id in comp_dirs:
        print(f"\nProcessing competition {comp_id}...")
        match_files = get_match_files(comp_id)
        print(f"  Found {len(match_files)} match files")
        total_match_files += len(match_files)

        for mf in match_files:
            url = f"{RAW_BASE}/matches/{comp_id}/{mf}"
            data = fetch_json(url)
            if not data:
                continue

            for match in data:
                match_id = match.get("match_id")
                match_date = match.get("match_date")
                home_team = match.get("home_team", {}).get("home_team_name", "")
                away_team = match.get("away_team", {}).get("away_team_name", "")

                key = (match_date, home_team, away_team)
                if key not in results_lookup:
                    key_rev = (match_date, away_team, home_team)
                    if key_rev not in results_lookup:
                        continue

                total_matches_found += 1
                print(f"  MATCH FOUND: {match_date} | {home_team} vs {away_team}")

                # Download lineup
                lineup_url = f"{RAW_BASE}/lineups/{match_id}.json"
                lineup_data = fetch_json(lineup_url)
                if not lineup_data:
                    print(f"    No lineup data for match {match_id}")
                    continue

                for team_entry in lineup_data:
                    team_name = team_entry.get("team_name", "")
                    lineup_players = team_entry.get("lineup", [])

                    for player in lineup_players:
                        positions = player.get("positions", [])
                        is_starter = "FALSE"
                        if positions:
                            is_starter = "TRUE" if any(p.get("position_id") for p in positions) else "FALSE"

                        all_squads.append({
                            "match_date": match_date,
                            "home_team": home_team,
                            "away_team": away_team,
                            "team": team_name,
                            "player_name": player.get("player_name", ""),
                            "shirt_no": str(player.get("jersey_number", "")),
                            "position": positions[0].get("position", "") if positions else "",
                            "starter": is_starter,
                            "captain": "FALSE",
                        })

    print(f"\n{'='*60}")
    print(f"Total match files scanned: {total_match_files}")
    print(f"Matching matches found: {total_matches_found}")
    print(f"Total squad entries: {len(all_squads)}")

    # Write CSV
    fieldnames = ["match_date", "home_team", "away_team", "team", "player_name", "shirt_no", "position", "starter", "captain"]
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_squads)

    print(f"Wrote {len(all_squads)} squad entries to {OUT_CSV}")

if __name__ == "__main__":
    main()
