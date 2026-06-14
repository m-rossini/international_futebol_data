"""Statistical analysis functions for international football data."""

import unicodedata

import pandas as pd
import numpy as np


def _strip_accents(text: str) -> str:
    """Remove diacritics/accents from text for fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.category(c).startswith("M"))


def total_matches(results: pd.DataFrame) -> int:
    return len(results)


def date_range(results: pd.DataFrame) -> tuple:
    if results.empty:
        return None, None
    return results["date"].min(), results["date"].max()


def tournaments_available(results: pd.DataFrame) -> pd.Series:
    return results["tournament"].value_counts()


def most_common_tournament(results: pd.DataFrame) -> str | None:
    if results.empty:
        return None
    return results["tournament"].mode().iloc[0]


def biggest_wins(results: pd.DataFrame, top_n: int = 10) -> list:
    """Return the top_n biggest goal margins as a ranked list."""
    if results.empty:
        return []
    df = results.copy()
    df["goal_diff"] = abs(df["home_score"] - df["away_score"])
    top = df.nlargest(top_n, "goal_diff")[
        ["date", "home_team", "away_team", "home_score", "away_score", "tournament", "city", "country"]
    ]
    records = top.to_dict(orient="records")
    for i, r in enumerate(records):
        r["rank"] = i + 1
        r["date"] = str(r["date"].date())
        r["goal_diff"] = int(abs(r["home_score"] - r["away_score"]))
        r["home_score"] = int(r["home_score"])
        r["away_score"] = int(r["away_score"])
    return records


def top_scorers(goalscorers: pd.DataFrame, top_n: int = 20) -> pd.Series:
    return goalscorers["scorer"].value_counts().head(top_n)


def top_scorers_by_national_team(
    goalscorers: pd.DataFrame, top_n: int = 20
) -> pd.DataFrame:
    return (
        goalscorers.groupby(["team", "scorer"])
        .size()
        .reset_index(name="goals")
        .sort_values("goals", ascending=False)
        .head(top_n)
    )


def team_win_rate(results: pd.DataFrame, team: str) -> dict:
    """Calculate win/draw/loss stats for a given team."""
    home_wins = results[(results["home_team"] == team) & (results["home_score"] > results["away_score"])]
    away_wins = results[(results["away_team"] == team) & (results["away_score"] > results["home_score"])]
    home_draws = results[(results["home_team"] == team) & (results["home_score"] == results["away_score"])]
    away_draws = results[(results["away_team"] == team) & (results["away_score"] == results["home_score"])]
    home_losses = results[(results["home_team"] == team) & (results["home_score"] < results["away_score"])]
    away_losses = results[(results["away_team"] == team) & (results["away_score"] < results["home_score"])]

    wins = len(home_wins) + len(away_wins)
    draws = len(home_draws) + len(away_draws)
    losses = len(home_losses) + len(away_losses)
    total = wins + draws + losses

    return {
        "team": team,
        "matches_played": total,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "win_rate": round(wins / total * 100, 2) if total else 0,
    }


def goals_per_year(
    results: pd.DataFrame,
    sort_by: str = "goals",
    order: str = "desc",
) -> list:
    """Total goals and average goals per match per year.

    Parameters
    ----------
    sort_by : str
        Column to sort by -- ``"year"``, ``"goals"``, or ``"ratio"`` (avg goals).
    order : str
        ``"asc"`` (ascending) or ``"desc"`` (descending, default).

    Returns
    -------
    list[dict]
        Each record: ``{"year": int, "goals": int, "matches": int, "avg_goals": float}``
    """
    if sort_by not in ("year", "goals", "ratio"):
        raise ValueError(f"Invalid sort_by '{sort_by}'. Use 'year', 'goals', or 'ratio'.")
    if order not in ("asc", "desc"):
        raise ValueError(f"Invalid order '{order}'. Use 'asc' or 'desc'.")

    if results.empty:
        return []

    df = results.copy()
    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]

    agg = df.groupby("year").agg(
        goals=("total_goals", "sum"),
        matches=("total_goals", "count"),
    ).reset_index()

    agg["avg_goals"] = round(agg["goals"] / agg["matches"], 2)

    # Map sort_by to column name
    col_map = {"year": "year", "goals": "goals", "ratio": "avg_goals"}
    sort_col = col_map[sort_by]
    ascending = order == "asc"

    agg = agg.sort_values(sort_col, ascending=ascending).reset_index(drop=True)

    result = []
    for _, row in agg.iterrows():
        result.append({
            "year": int(row["year"]),
            "goals": int(row["goals"]),
            "matches": int(row["matches"]),
            "avg_goals": float(row["avg_goals"]),
        })

    return result


def home_advantage(results: pd.DataFrame) -> dict:
    """Calculate home win/draw/loss percentages."""
    total = len(results)
    if total == 0:
        return {
            "total_matches": 0,
            "home_wins": 0,
            "home_win_pct": 0,
            "draws": 0,
            "draw_pct": 0,
            "away_wins": 0,
            "away_win_pct": 0,
        }
    home_wins = len(results[results["home_score"] > results["away_score"]])
    draws = len(results[results["home_score"] == results["away_score"]])
    away_wins = len(results[results["home_score"] < results["away_score"]])

    return {
        "total_matches": total,
        "home_wins": home_wins,
        "home_win_pct": round(home_wins / total * 100, 2),
        "draws": draws,
        "draw_pct": round(draws / total * 100, 2),
        "away_wins": away_wins,
        "away_win_pct": round(away_wins / total * 100, 2),
    }


def shootout_stats(shootouts: pd.DataFrame) -> dict:
    """Basic shootout statistics."""
    winner_counts = shootouts["winner"].value_counts().head(20)
    return {
        "total_shootouts": len(shootouts),
        "most_shootout_wins": winner_counts,
    }


def results_metadata(results: pd.DataFrame) -> dict:
    """Metadata about the results dataset."""
    dr = date_range(results)
    return {
        "total_matches": total_matches(results),
        "date_range": {
            "from": str(dr[0].date()) if dr[0] is not None else None,
            "to": str(dr[1].date()) if dr[1] is not None else None,
        },
        "tournaments_count": len(tournaments_available(results)),
        "most_common_tournament": most_common_tournament(results),
        "unique_home_teams": int(results["home_team"].nunique()) if not results.empty else 0,
        "unique_away_teams": int(results["away_team"].nunique()) if not results.empty else 0,
        "total_goals": int(results["home_score"].sum() + results["away_score"].sum()),
        "avg_goals_per_match": round(
            float(results["home_score"].sum() + results["away_score"].sum()) / len(results), 2
        ) if not results.empty else 0,
        "home_advantage": home_advantage(results),
    }


def goalscorers_metadata(goalscorers: pd.DataFrame) -> dict:
    """Metadata about the goalscorers dataset."""
    dr = date_range(goalscorers)
    return {
        "total_goals_recorded": len(goalscorers),
        "unique_scorers": int(goalscorers["scorer"].nunique()),
        "unique_teams_scored_for": int(goalscorers["team"].nunique()),
        "date_range": {"from": str(dr[0].date()), "to": str(dr[1].date())},
        "own_goals": int(goalscorers["own_goal"].sum()),
        "penalty_goals": int(goalscorers["penalty"].sum()),
        "top_scorer": goalscorers["scorer"].value_counts().head(1).to_dict(),
    }


def shootouts_metadata(shootouts: pd.DataFrame) -> dict:
    """Metadata about the shootouts dataset."""
    dr = date_range(shootouts)
    return {
        "total_shootouts": len(shootouts),
        "date_range": {"from": str(dr[0].date()), "to": str(dr[1].date())},
        "unique_winners": int(shootouts["winner"].nunique()),
        "most_common_winner": str(shootouts["winner"].mode().iloc[0]) if len(shootouts) else None,
    }


def former_names_metadata(former_names: pd.DataFrame) -> dict:
    """Metadata about the former_names dataset."""
    return {
        "total_renamed_countries": len(former_names),
        "unique_current_names": int(former_names["current"].nunique()),
        "unique_former_names": int(former_names["former"].nunique()),
        "earliest_rename": str(former_names["start_date"].min().date()) if len(former_names) else None,
        "latest_rename": str(former_names["end_date"].max().date()) if len(former_names) else None,
    }


# ---------------------------------------------------------------------------
#  /most/{stat} support
# ---------------------------------------------------------------------------


def _team_aggregate(results: pd.DataFrame) -> pd.DataFrame:
    """Compute per-team aggregate stats (wins, losses, draws, goals, rates)."""
    if results.empty:
        return pd.DataFrame()

    # Home records
    home = results[["home_team", "home_score", "away_score"]].copy()
    home.columns = ["team", "goals_for", "goals_against"]

    # Away records
    away = results[["away_team", "away_score", "home_score"]].copy()
    away.columns = ["team", "goals_for", "goals_against"]

    combined = pd.concat([home, away], ignore_index=True)

    agg = combined.groupby("team").agg(
        matches_played=("goals_for", "count"),
        goals_for=("goals_for", "sum"),
        goals_against=("goals_against", "sum"),
    ).reset_index()

    # Now compute wins/losses/draws separately via the results table
    # Home wins
    hw = results[results["home_score"] > results["away_score"]].groupby("home_team").size()
    # Away wins
    aw = results[results["away_score"] > results["home_score"]].groupby("away_team").size()
    # Home losses
    hl = results[results["home_score"] < results["away_score"]].groupby("home_team").size()
    # Away losses
    al = results[results["away_score"] < results["home_score"]].groupby("away_team").size()
    # Home draws
    hd = results[results["home_score"] == results["away_score"]].groupby("home_team").size()
    # Away draws
    ad = results[results["home_score"] == results["away_score"]].groupby("away_team").size()

    def _safe_add(s1, s2):
        return s1.add(s2, fill_value=0)

    wins = _safe_add(hw, aw)
    losses = _safe_add(hl, al)
    draws = _safe_add(hd, ad)

    agg = agg.merge(wins.rename("wins"), left_on="team", right_index=True, how="left")
    agg = agg.merge(losses.rename("losses"), left_on="team", right_index=True, how="left")
    agg = agg.merge(draws.rename("draws"), left_on="team", right_index=True, how="left")

    agg = agg.fillna(0)
    for col in ["wins", "losses", "draws"]:
        agg[col] = agg[col].astype(int)

    agg["win_rate"] = round(agg["wins"] / agg["matches_played"] * 100, 2)
    agg["loss_rate"] = round(agg["losses"] / agg["matches_played"] * 100, 2)

    return agg


_MOST_TEAM_STATS = {
    "wins": "wins",
    "losses": "losses",
    "draws": "draws",
    "win_rate": "win_rate",
    "loss_rate": "loss_rate",
    "goals_pro": "goals_for",
    "goals_against": "goals_against",
    "matches": "matches_played",
}

_MIN_MATCHES_FOR_RATES = 10


def most_teams(results: pd.DataFrame, stat: str, top_n: int = 20) -> list:
    """Top N teams by a given aggregate stat."""
    if results.empty:
        return []

    if stat not in _MOST_TEAM_STATS:
        valid = ", ".join(_MOST_TEAM_STATS)
        raise ValueError(f"Unknown stat '{stat}'. Valid: {valid}")

    col = _MOST_TEAM_STATS[stat]
    agg = _team_aggregate(results)

    if agg.empty:
        return []

    if stat in ("win_rate", "loss_rate"):
        agg = agg[agg["matches_played"] >= _MIN_MATCHES_FOR_RATES]

    result = agg.nlargest(top_n, col)[["team", col]].to_dict(orient="records")
    # Cast integer columns to native int
    if col in ("goals_for", "goals_against", "matches_played"):
        for row in result:
            row[col] = int(row[col])
    return result


def most_countries(results: pd.DataFrame, top_n: int = 20) -> list:
    """Top N countries by number of matches hosted."""
    if results.empty:
        return []
    counts = results["country"].value_counts().head(top_n)
    return [{"country": country, "matches": int(c)} for country, c in counts.items()]


def most_cities(results: pd.DataFrame, top_n: int = 20) -> list:
    """Top N cities by number of matches hosted."""
    if results.empty:
        return []
    counts = results["city"].value_counts().head(top_n)
    return [{"city": city, "matches": int(c)} for city, c in counts.items()]


# ---------------------------------------------------------------------------
#  Tournament endpoints
# ---------------------------------------------------------------------------


def _per_tournament_agg(results: pd.DataFrame) -> pd.DataFrame:
    """Build a per-tournament aggregate DataFrame with all stats."""
    df = results.copy()
    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]
    df["home_win"] = df["home_score"] > df["away_score"]
    df["away_win"] = df["away_score"] > df["home_score"]
    df["draw"] = df["home_score"] == df["away_score"]

    agg = df.groupby("tournament").agg(
        first_year=("year", "min"),
        last_year=("year", "max"),
        editions=("year", pd.Series.nunique),
        matches=("total_goals", "count"),
        total_goals=("total_goals", "sum"),
        home_wins=("home_win", "sum"),
        away_wins=("away_win", "sum"),
        draws=("draw", "sum"),
        unique_teams_home=("home_team", pd.Series.nunique),
        unique_teams_away=("away_team", pd.Series.nunique),
    ).reset_index()

    agg["avg_goals"] = round(agg["total_goals"] / agg["matches"], 2)
    agg["unique_teams"] = agg[["unique_teams_home", "unique_teams_away"]].max(axis=1)
    agg = agg.drop(columns=["unique_teams_home", "unique_teams_away"])

    # Cast ints
    for col in ["first_year", "last_year", "editions", "matches", "total_goals",
                 "home_wins", "away_wins", "draws"]:
        agg[col] = agg[col].astype(int)

    return agg


def tournaments_list(results: pd.DataFrame) -> list:
    """List all tournaments with comprehensive aggregate stats."""
    agg = _per_tournament_agg(results)
    records = agg.sort_values("matches", ascending=False).to_dict(orient="records")
    for r in records:
        r["total_goals"] = int(r["total_goals"])
    return records


def tournament_info(results: pd.DataFrame, tournament: str, top_n: int = 10) -> dict:
    """Comprehensive stats for a specific tournament, with yearly breakdown."""
    df = results[results["tournament"] == tournament].copy()
    if df.empty:
        raise ValueError(f"Unknown tournament: '{tournament}'")

    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]
    df["home_win"] = df["home_score"] > df["away_score"]
    df["away_win"] = df["away_score"] > df["home_score"]
    df["draw"] = df["home_score"] == df["away_score"]

    # -- overall summary --
    first_year = int(df["year"].min())
    last_year = int(df["year"].max())
    matches = len(df)
    total_goals = int(df["total_goals"].sum())
    avg_goals = round(total_goals / matches, 2) if matches else 0
    home_wins = int(df["home_win"].sum())
    away_wins = int(df["away_win"].sum())
    draws = int(df["draw"].sum())
    unique_teams = int(pd.concat([df["home_team"], df["away_team"]]).nunique())

    # -- biggest win --
    df["goal_diff"] = abs(df["home_score"] - df["away_score"])
    biggest = df.nlargest(1, "goal_diff").iloc[0] if len(df) else None
    biggest_win = None
    if biggest is not None:
        biggest_win = {
            "date": str(biggest["date"].date()),
            "home_team": biggest["home_team"],
            "away_team": biggest["away_team"],
            "home_score": int(biggest["home_score"]),
            "away_score": int(biggest["away_score"]),
        }

    # -- most successful teams --
    def _winner(row):
        if row["home_score"] > row["away_score"]:
            return row["home_team"]
        elif row["away_score"] > row["home_score"]:
            return row["away_team"]
        return None

    df["winner"] = df.apply(_winner, axis=1)
    top_teams = df["winner"].value_counts().head(top_n)
    top_teams_list = [{"team": team, "wins": int(wins)} for team, wins in top_teams.items()]

    # -- top host countries / cities --
    top_countries = df["country"].value_counts().head(top_n)
    top_cities = df["city"].value_counts().head(top_n)

    # -- yearly breakdown --
    yearly = df.groupby("year").agg(
        matches=("total_goals", "count"),
        goals=("total_goals", "sum"),
        home_wins=("home_win", "sum"),
        away_wins=("away_win", "sum"),
        draws=("draw", "sum"),
        teams=("home_team", lambda x: len(set(x) | set(df.loc[x.index, "away_team"]))),
    ).reset_index()

    yearly_list = []
    for _, row in yearly.iterrows():
        y = int(row["year"])
        yr_df = df[df["year"] == y]
        host = yr_df["country"].mode().iloc[0] if len(yr_df) else None
        yearly_list.append({
            "year": y,
            "matches": int(row["matches"]),
            "goals": int(row["goals"]),
            "avg_goals": round(row["goals"] / row["matches"], 2) if row["matches"] else 0,
            "home_wins": int(row["home_wins"]),
            "away_wins": int(row["away_wins"]),
            "draws": int(row["draws"]),
            "teams": int(row["teams"]),
            "host_country": host,
        })

    return {
        "tournament": tournament,
        "summary": {
            "first_year": first_year,
            "last_year": last_year,
            "editions": int(df["year"].nunique()),
            "matches": matches,
            "total_goals": total_goals,
            "avg_goals_per_match": avg_goals,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "draws": draws,
            "unique_teams": unique_teams,
            "biggest_win": biggest_win,
            "top_teams_by_wins": top_teams_list,
            "top_host_countries": [{"country": c, "matches": int(m)} for c, m in top_countries.items()],
            "top_host_cities": [{"city": c, "matches": int(m)} for c, m in top_cities.items()],
        },
        "yearly": yearly_list,
    }


# ---------------------------------------------------------------------------
#  City endpoints
# ---------------------------------------------------------------------------


def cities_list(results: pd.DataFrame) -> list:
    """List all cities with comprehensive stats."""
    df = results.copy()
    df["total_goals"] = df["home_score"] + df["away_score"]
    df["home_win"] = df["home_score"] > df["away_score"]
    df["away_win"] = df["away_score"] > df["home_score"]
    df["draw"] = df["home_score"] == df["away_score"]

    agg = df.groupby("city").agg(
        country=("country", lambda x: x.mode().iloc[0] if len(x.mode()) else None),
        matches=("total_goals", "count"),
        total_goals=("total_goals", "sum"),
        home_wins=("home_win", "sum"),
        away_wins=("away_win", "sum"),
        draws=("draw", "sum"),
        unique_teams=("home_team", lambda x: len(set(x) | set(df.loc[x.index, "away_team"]))),
        tournaments=("tournament", pd.Series.nunique),
        first_year=("date", lambda x: x.dt.year.min()),
        last_year=("date", lambda x: x.dt.year.max()),
    ).reset_index()

    agg["avg_goals"] = round(agg["total_goals"] / agg["matches"], 2)

    for col in ["matches", "total_goals", "home_wins", "away_wins", "draws",
                 "unique_teams", "tournaments"]:
        agg[col] = agg[col].astype(int)

    return agg.sort_values("matches", ascending=False).to_dict(orient="records")


def city_info(results: pd.DataFrame, city: str, top_n: int = 10) -> dict:
    """Comprehensive stats for a specific city."""
    city_key = _strip_accents(city).lower()
    mask = results["city"].apply(lambda x: _strip_accents(x).lower()) == city_key
    df = results[mask].copy()
    if df.empty:
        raise ValueError(f"Unknown city: '{city}'")

    canonical = df["city"].iloc[0]
    country = df["country"].mode().iloc[0]
    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]
    df["home_win"] = df["home_score"] > df["away_score"]
    df["away_win"] = df["away_score"] > df["home_score"]
    df["draw"] = df["home_score"] == df["away_score"]

    matches = len(df)
    total_goals = int(df["total_goals"].sum())
    avg_goals = round(total_goals / matches, 2) if matches else 0
    home_wins = int(df["home_win"].sum())
    away_wins = int(df["away_win"].sum())
    draws = int(df["draw"].sum())
    unique_teams = int(pd.concat([df["home_team"], df["away_team"]]).nunique())
    unique_tournaments = int(df["tournament"].nunique())
    first_year = int(df["year"].min())
    last_year = int(df["year"].max())

    # biggest win
    df["goal_diff"] = abs(df["home_score"] - df["away_score"])
    biggest = df.nlargest(1, "goal_diff").iloc[0] if len(df) else None
    biggest_win = None
    if biggest is not None:
        biggest_win = {
            "date": str(biggest["date"].date()),
            "home_team": biggest["home_team"],
            "away_team": biggest["away_team"],
            "home_score": int(biggest["home_score"]),
            "away_score": int(biggest["away_score"]),
            "tournament": biggest["tournament"],
        }

    # top teams
    def _winner(row):
        if row["home_score"] > row["away_score"]:
            return row["home_team"]
        elif row["away_score"] > row["home_score"]:
            return row["away_team"]
        return None

    df["winner"] = df.apply(_winner, axis=1)
    top_teams = df["winner"].value_counts().head(top_n)

    # top tournaments
    top_tournaments = df["tournament"].value_counts().head(top_n)

    return {
        "city": canonical,
        "country": country,
        "summary": {
            "matches": matches,
            "first_year": first_year,
            "last_year": last_year,
            "total_goals": total_goals,
            "avg_goals_per_match": avg_goals,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "draws": draws,
            "unique_teams": unique_teams,
            "unique_tournaments": unique_tournaments,
            "biggest_win": biggest_win,
            "top_teams_by_wins": [{"team": t, "wins": int(w)} for t, w in top_teams.items()],
            "top_tournaments": [{"tournament": t, "matches": int(m)} for t, m in top_tournaments.items()],
        },
    }


# ---------------------------------------------------------------------------
#  Country endpoints
# ---------------------------------------------------------------------------


def countries_list(results: pd.DataFrame) -> list:
    """List all countries with comprehensive stats."""
    df = results.copy()
    df["total_goals"] = df["home_score"] + df["away_score"]
    df["home_win"] = df["home_score"] > df["away_score"]
    df["away_win"] = df["away_score"] > df["home_score"]
    df["draw"] = df["home_score"] == df["away_score"]

    agg = df.groupby("country").agg(
        matches=("total_goals", "count"),
        total_goals=("total_goals", "sum"),
        home_wins=("home_win", "sum"),
        away_wins=("away_win", "sum"),
        draws=("draw", "sum"),
        unique_teams=("home_team", lambda x: len(set(x) | set(df.loc[x.index, "away_team"]))),
        tournaments=("tournament", pd.Series.nunique),
        cities=("city", pd.Series.nunique),
        first_year=("date", lambda x: x.dt.year.min()),
        last_year=("date", lambda x: x.dt.year.max()),
    ).reset_index()

    agg["avg_goals"] = round(agg["total_goals"] / agg["matches"], 2)

    for col in ["matches", "total_goals", "home_wins", "away_wins", "draws",
                 "unique_teams", "tournaments", "cities"]:
        agg[col] = agg[col].astype(int)

    return agg.sort_values("matches", ascending=False).to_dict(orient="records")


def country_info(results: pd.DataFrame, country: str, top_n: int = 10) -> dict:
    """Comprehensive stats for a specific country."""
    country_key = _strip_accents(country).lower()
    mask = results["country"].apply(lambda x: _strip_accents(x).lower()) == country_key
    df = results[mask].copy()
    if df.empty:
        raise ValueError(f"Unknown country: '{country}'")

    canonical = df["country"].iloc[0]
    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]
    df["home_win"] = df["home_score"] > df["away_score"]
    df["away_win"] = df["away_score"] > df["home_score"]
    df["draw"] = df["home_score"] == df["away_score"]

    matches = len(df)
    total_goals = int(df["total_goals"].sum())
    avg_goals = round(total_goals / matches, 2) if matches else 0
    home_wins = int(df["home_win"].sum())
    away_wins = int(df["away_win"].sum())
    draws = int(df["draw"].sum())
    unique_teams = int(pd.concat([df["home_team"], df["away_team"]]).nunique())
    unique_tournaments = int(df["tournament"].nunique())
    unique_cities = int(df["city"].nunique())
    first_year = int(df["year"].min())
    last_year = int(df["year"].max())

    # biggest win
    df["goal_diff"] = abs(df["home_score"] - df["away_score"])
    biggest = df.nlargest(1, "goal_diff").iloc[0] if len(df) else None
    biggest_win = None
    if biggest is not None:
        biggest_win = {
            "date": str(biggest["date"].date()),
            "home_team": biggest["home_team"],
            "away_team": biggest["away_team"],
            "home_score": int(biggest["home_score"]),
            "away_score": int(biggest["away_score"]),
            "tournament": biggest["tournament"],
            "city": biggest["city"],
        }

    # top teams
    def _winner(row):
        if row["home_score"] > row["away_score"]:
            return row["home_team"]
        elif row["away_score"] > row["home_score"]:
            return row["away_team"]
        return None

    df["winner"] = df.apply(_winner, axis=1)
    top_teams = df["winner"].value_counts().head(top_n)

    # top tournaments
    top_tournaments = df["tournament"].value_counts().head(top_n)

    # top cities
    top_cities = df["city"].value_counts().head(top_n)

    return {
        "country": canonical,
        "summary": {
            "matches": matches,
            "first_year": first_year,
            "last_year": last_year,
            "total_goals": total_goals,
            "avg_goals_per_match": avg_goals,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "draws": draws,
            "unique_teams": unique_teams,
            "unique_tournaments": unique_tournaments,
            "unique_cities": unique_cities,
            "biggest_win": biggest_win,
            "top_teams_by_wins": [{"team": t, "wins": int(w)} for t, w in top_teams.items()],
            "top_tournaments": [{"tournament": t, "matches": int(m)} for t, m in top_tournaments.items()],
            "top_cities": [{"city": c, "matches": int(m)} for c, m in top_cities.items()],
        },
    }


def team_vs_team(results: pd.DataFrame, team1: str, team2: str) -> dict:
    """Head-to-head stats between two teams."""
    mask = (
        ((results["home_team"] == team1) & (results["away_team"] == team2))
        | ((results["home_team"] == team2) & (results["away_team"] == team1))
    )
    matches = results[mask].copy()

    def winner(row):
        if row["home_score"] > row["away_score"]:
            return row["home_team"]
        elif row["away_score"] > row["home_score"]:
            return row["away_team"]
        return "Draw"

    matches["winner"] = matches.apply(winner, axis=1)

    team1_wins = len(matches[matches["winner"] == team1])
    team2_wins = len(matches[matches["winner"] == team2])
    draws = len(matches[matches["winner"] == "Draw"])

    team1_goals = matches[
        (matches["home_team"] == team1)
    ]["home_score"].sum() + matches[
        (matches["away_team"] == team1)
    ]["away_score"].sum()

    team2_goals = matches[
        (matches["home_team"] == team2)
    ]["home_score"].sum() + matches[
        (matches["away_team"] == team2)
    ]["away_score"].sum()

    return {
        "team1": team1,
        "team2": team2,
        "matches": len(matches),
        f"{team1}_wins": team1_wins,
        f"{team2}_wins": team2_wins,
        "draws": draws,
        f"{team1}_goals": int(team1_goals),
        f"{team2}_goals": int(team2_goals),
    }
