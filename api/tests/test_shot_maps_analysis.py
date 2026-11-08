"""Tests for stats/analysis/shot_maps.py — Shot Maps Open Data event loading."""

import pandas as pd

from football_stats.stats.analysis.shot_maps import (
    load_events,
    match_has_events,
    shots_for_match,
)


def test_load_events_no_dir(monkeypatch):
    """load_events returns empty frame when events dir doesn't exist."""
    monkeypatch.setattr(
        "football_stats.stats.analysis.shot_maps._EVENTS_DIR",
        "/nonexistent/events/dir",
    )
    events = load_events()
    assert events.empty
    assert list(events.columns) == [
        "match_id",
        "team",
        "player_name",
        "type",
        "minute",
        "x",
        "y",
        "xg",
        "body_part",
        "outcome",
    ]


def test_load_events_empty_dir(tmp_path, monkeypatch):
    """load_events returns empty frame when events dir is empty."""
    monkeypatch.setattr(
        "football_stats.stats.analysis.shot_maps._EVENTS_DIR", str(tmp_path)
    )
    events = load_events()
    assert events.empty


def test_load_events_jsonl(tmp_path, monkeypatch):
    """load_events reads JSONL files from events dir."""
    monkeypatch.setattr(
        "football_stats.stats.analysis.shot_maps._EVENTS_DIR", str(tmp_path)
    )

    # Write a JSONL events file
    events_file = tmp_path / "wc2022.jsonl"
    events_file.write_text(
        '{"match_id":"wc2022_final","team":"Argentina","player_name":"Messi","type":"Shot","minute":45,"x":55.0,"y":35.0,"xg":0.45,"body_part":"Left foot","outcome":"Saved"}\n'
        '{"match_id":"wc2022_final","team":"France","player_name":"Mbappe","type":"Shot","minute":80,"x":70.0,"y":40.0,"xg":0.62,"body_part":"Right foot","outcome":"Goal"}\n'
    )

    events = load_events()
    assert len(events) == 2
    assert events.iloc[0]["player_name"] == "Messi"
    assert events.iloc[1]["player_name"] == "Mbappe"


def test_shots_for_match_empty():
    """shots_for_match returns empty list for empty events."""
    assert shots_for_match(pd.DataFrame(), "match_1") == []
    assert shots_for_match(None, "match_1") == []


def test_shots_for_match_filters():
    """shots_for_match filters by match_id and type=='Shot'."""
    df = pd.DataFrame(
        {
            "match_id": ["m1", "m1", "m1", "m2"],
            "team": ["Argentina", "Argentina", "France", "Argentina"],
            "player_name": ["Messi", "Di Maria", "Mbappe", "Messi"],
            "type": ["Shot", "Pass", "Shot", "Shot"],
            "minute": [45, 30, 80, 20],
            "x": [55.0, 40.0, 70.0, 30.0],
            "y": [35.0, 25.0, 40.0, 50.0],
            "xg": [0.45, None, 0.62, 0.15],
            "body_part": ["Left foot", "Right foot", "Right foot", "Left foot"],
            "outcome": ["Saved", None, "Goal", "Saved"],
        }
    )
    shots = shots_for_match(df, "m1")

    assert len(shots) == 2
    assert shots[0]["player_name"] == "Messi"
    assert shots[0]["xg"] == 0.45
    assert shots[1]["player_name"] == "Mbappe"
    assert shots[1]["xg"] == 0.62

    # m2 shot should not be included (all shots returned are for m1)
    assert all(
        s["player_name"] in ("Messi", "Mbappe") for s in shots
    )  # match_id not in output


def test_match_has_events_empty():
    """match_has_events returns False for empty events."""
    assert match_has_events(pd.DataFrame(), "match_1") is False
    assert match_has_events(None, "match_1") is False


def test_match_has_events_found():
    """match_has_events returns True when match exists."""
    df = pd.DataFrame(
        {
            "match_id": ["m1", "m1", "m2"],
            "team": ["Argentina", "Argentina", "France"],
            "player_name": ["Messi", "Di Maria", "Mbappe"],
        }
    )
    assert match_has_events(df, "m1") is True
    assert match_has_events(df, "m2") is True
    assert match_has_events(df, "m99") is False
