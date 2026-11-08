"""Tests for stats/analysis/squads.py — squad analysis derived from squads.csv."""

import pandas as pd

from football_stats.stats.analysis.squads import squad_info, squads_list


def test_squads_list_empty():
    """Empty DataFrame returns empty list."""
    result = squads_list(pd.DataFrame())
    assert result == []

    result = squads_list(None)
    assert result == []


def test_squads_list_basic():
    """List matches with squad data, newest first."""
    df = pd.DataFrame(
        {
            "match_date": ["2022-12-14", "2022-12-18", "2022-12-18"],
            "home_team": ["Argentina", "Argentina", "Argentina"],
            "away_team": ["Croatia", "France", "France"],
            "team": ["Argentina", "France", "France"],
            "player_name": ["Messi", "Mbappe", "Mbappe"],
            "shirt_no": [10, 10, 10],
            "position": ["Forward", "Forward", "Forward"],
            "starter": [True, True, True],
            "captain": [False, False, True],
        }
    )
    result = squads_list(df)

    # 3 rows collapse to 2 unique matches (Dec 18 appears twice for Argentina vs France),
    # sorted newest first
    assert len(result) == 2
    assert result[0]["match_date"] == "2022-12-18"
    assert result[0]["home_team"] == "Argentina"
    assert result[0]["away_team"] == "France"
    assert result[1]["match_date"] == "2022-12-14"
    assert result[1]["home_team"] == "Argentina"
    assert result[1]["away_team"] == "Croatia"


def test_squad_info_basic():
    """Squad detail returns both teams' XI and bench."""
    df = pd.DataFrame(
        {
            "match_date": [
                "2022-12-18",
                "2022-12-18",
                "2022-12-18",
                "2022-12-18",
                "2022-12-18",
                "2022-12-18",
                "2022-12-18",
                "2022-12-18",
            ],
            "home_team": ["Argentina"] * 8,
            "away_team": ["France"] * 8,
            "team": ["Argentina"] * 4 + ["France"] * 4,
            "player_name": [
                "Messi",
                "Di Maria",
                "Martinez",
                "Alvarez",
                "Mbappe",
                "Giroud",
                "Lloris",
                "Varane",
            ],
            "shirt_no": [10, 11, 23, 9, 10, 9, 1, 4],
            "position": [
                "Forward",
                "Forward",
                "Goalkeeper",
                "Forward",
                "Forward",
                "Forward",
                "Goalkeeper",
                "Defender",
            ],
            "starter": [True, True, True, True, True, True, True, True],
            "captain": [False, False, False, False, False, False, True, False],
        }
    )
    result = squad_info(df, "2022-12-18", "Argentina", "France")

    assert result["match_date"] == "2022-12-18"
    assert result["home_team"] == "Argentina"
    assert result["away_team"] == "France"
    assert len(result["squads"]) == 2

    argentina = result["squads"][0]
    france = result["squads"][1]

    # Both teams have XI + bench (4+4 = 8 starters each)
    assert len(argentina["xi"]) == 4
    assert len(france["xi"]) == 4
    assert len(argentina["bench"]) == 0
    assert len(france["bench"]) == 0

    # Messi is in Argentina's XI (sorted by shirt_no, so not necessarily first)
    messi_names = [p["player_name"] for p in argentina["xi"]]
    assert "Messi" in messi_names


def test_squad_info_empty():
    """Empty DataFrame raises ValueError."""
    try:
        squad_info(pd.DataFrame(), "2022-12-18", "Argentina", "France")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "No squad data available" in str(e)


def test_squad_info_not_found():
    """Unknown match raises ValueError."""
    df = pd.DataFrame(
        {
            "match_date": ["2022-12-18"],
            "home_team": ["Argentina"],
            "away_team": ["France"],
            "team": ["Argentina"],
            "player_name": ["Messi"],
            "shirt_no": [10],
            "position": ["Forward"],
            "starter": [True],
            "captain": [False],
        }
    )
    try:
        squad_info(df, "2022-12-19", "Argentina", "France")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "No squad data" in str(e)


def test_squad_info_captain_and_bench():
    """Captain flag and bench separation work correctly."""
    df = pd.DataFrame(
        {
            "match_date": ["2022-12-18"] * 6,
            "home_team": ["Argentina"] * 3 + ["France"] * 3,
            "away_team": ["France"] * 3 + ["Argentina"] * 3,
            "team": ["Argentina"] * 3 + ["France"] * 3,
            "player_name": [
                "Messi",
                "Di Maria",
                "Sub Player",
                "Mbappe",
                "Giroud",
                "Sub F",
            ],
            "shirt_no": [10, 11, 20, 10, 9, 19],
            "position": [
                "Forward",
                "Forward",
                "Midfielder",
                "Forward",
                "Forward",
                "Midfielder",
            ],
            "starter": [True, True, False, True, True, False],
            "captain": [True, False, False, False, False, False],
        }
    )
    result = squad_info(df, "2022-12-18", "Argentina", "France")

    argentina = result["squads"][0]
    # Messi is captain
    messi = next(p for p in argentina["xi"] if p["player_name"] == "Messi")
    assert messi["captain"] is True
    # Sub Player is on bench
    sub = next(p for p in argentina["bench"] if p["player_name"] == "Sub Player")
    assert sub["captain"] is False


def test_squad_info_shirt_no_none():
    """shirt_no can be None (NaN)."""
    df = pd.DataFrame(
        {
            "match_date": ["2022-12-18"],
            "home_team": ["Argentina"],
            "away_team": ["France"],
            "team": ["Argentina"],
            "player_name": ["Messi"],
            "shirt_no": [None],
            "position": ["Forward"],
            "starter": [True],
            "captain": [False],
        }
    )
    result = squad_info(df, "2022-12-18", "Argentina", "France")
    argentina = result["squads"][0]
    assert argentina["xi"][0]["shirt_no"] is None
