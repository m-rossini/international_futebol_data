"""Pydantic response models for OpenAPI documentation.

These mirror the actual dict shapes returned by each endpoint so
FastAPI's automatic /docs & /openapi.json show full field-level schemas.
"""

from __future__ import annotations

from typing import Any, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


# ===========================================================================
#  Advanced stats primitives
# ===========================================================================

class SeriesStats(BaseModel):
    """Full descriptive statistics for a numeric series."""
    count: int = Field(description="Number of non-null values")
    sum: float = Field(description="Sum of all values (float to accommodate any dtype)")
    mean: Optional[float] = Field(default=None, description="Arithmetic mean")
    median: Optional[float] = Field(default=None, description="50th percentile")
    mode: list[float] = Field(default_factory=list, description="Most frequent value(s)")
    min: Optional[float] = Field(default=None, description="Minimum value")
    max: Optional[float] = Field(default=None, description="Maximum value")
    stdev: Optional[float] = Field(default=None, description="Sample standard deviation")
    variance: Optional[float] = Field(default=None, description="Sample variance")
    skewness: Optional[float] = Field(default=None, description="Skewness (asymmetry)")
    kurtosis: Optional[float] = Field(default=None, description="Excess kurtosis")
    p25: Optional[float] = Field(default=None, description="25th percentile (Q1)")
    p50: Optional[float] = Field(default=None, description="50th percentile (median)")
    p75: Optional[float] = Field(default=None, description="75th percentile (Q3)")
    iqr: Optional[float] = Field(default=None, description="Inter-quartile range (Q3 - Q1)")
    range: Optional[int] = Field(default=None, description="Range (max - min)")

    model_config = ConfigDict(extra="allow")


class GoalDistribution(BaseModel):
    """Descriptive stats for goals scored / conceded across all matches."""
    home_score: SeriesStats
    away_score: SeriesStats
    total_goals: SeriesStats
    goal_diff: SeriesStats


class MatchDistribution(BaseModel):
    """Frequency distributions: matches per year / per tournament."""
    matches_per_year: SeriesStats
    matches_per_tournament: SeriesStats


class ScorerDistribution(BaseModel):
    """Distribution of goals per individual scorer."""
    goals_per_scorer: SeriesStats


class WinnerDistribution(BaseModel):
    """Distribution of shootout wins per winner team."""
    winner_frequency: SeriesStats


# ===========================================================================
#  Shared primitives
# ===========================================================================

class DateRange(BaseModel):
    from_field: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None


class HomeAdvantage(BaseModel):
    total_matches: int
    home_wins: int
    home_win_pct: float
    draws: int
    draw_pct: float
    away_wins: int
    away_win_pct: float


# ===========================================================================
#  GET /summary
# ===========================================================================

class ResultsMetadata(BaseModel):
    total_matches: int
    date_range: DateRange
    tournaments_count: int
    most_common_tournament: Optional[str] = None
    unique_home_teams: int
    unique_away_teams: int
    total_goals: int
    avg_goals_per_match: float
    home_advantage: HomeAdvantage
    goal_distribution: GoalDistribution
    match_distribution: MatchDistribution


class GoalscorersMetadata(BaseModel):
    total_goals_recorded: int
    unique_scorers: int
    unique_teams_scored_for: int
    date_range: DateRange
    own_goals: int
    penalty_goals: int
    top_scorer: dict[str, int]
    scorer_distribution: ScorerDistribution


class ShootoutsMetadata(BaseModel):
    total_shootouts: int
    date_range: DateRange
    unique_winners: int
    most_common_winner: Optional[str] = None
    winner_distribution: WinnerDistribution


class FormerNamesMetadata(BaseModel):
    total_renamed_countries: int
    unique_current_names: int
    unique_former_names: int
    earliest_rename: Optional[str] = None
    latest_rename: Optional[str] = None


class SummaryResponse(BaseModel):
    results: ResultsMetadata
    goalscorers: GoalscorersMetadata
    shootouts: ShootoutsMetadata
    former_names: FormerNamesMetadata


# ===========================================================================
#  GET /team/{team_name}
# ===========================================================================

class TeamResponse(BaseModel):
    team: str
    matches_played: int
    wins: int
    draws: int
    losses: int
    points: int
    win_rate: float
    goals_for_stats: Optional[SeriesStats] = None
    goals_against_stats: Optional[SeriesStats] = None
    goal_diff_stats: Optional[SeriesStats] = None
    biggest_wins: list[dict] = Field(default_factory=list, description="Top 3 wins by goal margin")
    error: Optional[bool] = None
    message: Optional[str] = None


# ===========================================================================
#  GET /head_to_head
# ===========================================================================

class H2HMatchItem(BaseModel):
    """A single match between two teams in head-to-head results."""
    date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    tournament: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    neutral: Optional[bool] = None

    model_config = ConfigDict(extra="allow")


class HeadToHeadResponse(BaseModel):
    team1: str
    team2: str
    matches: int
    draws: int
    total_goals_per_match_stats: Optional[SeriesStats] = None
    matches_list: list[H2HMatchItem] = Field(default_factory=list)
    error: Optional[bool] = None
    message: Optional[str] = None

    model_config = ConfigDict(extra="allow")  # dynamic keys like "Brazil_wins"


# ===========================================================================
#  GET /top_scorers
# ===========================================================================

class TopScorersResponse(BaseModel):
    """Dict mapping scorer name → goal count.

    Shape: {"Cristiano Ronaldo": 135, "Lionel Messi": 112, ...}
    """
    model_config = ConfigDict(extra="allow")


# ===========================================================================
#  GET /biggest_wins
# ===========================================================================

class BiggestWinItem(BaseModel):
    rank: int
    date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    tournament: str
    city: Optional[str] = None
    country: Optional[str] = None
    goal_diff: int

    model_config = ConfigDict(extra="allow")


# ===========================================================================
#  GET /goals_per_year
# ===========================================================================

class GoalsPerYearItem(BaseModel):
    year: int
    goals: int
    matches: int
    avg_goals: float


# ===========================================================================
#  GET /most/{stat}
# ===========================================================================

class TeamRankingItem(BaseModel):
    team: str

    model_config = ConfigDict(extra="allow")  # dynamic key like "wins"


class TeamRankingResponse(BaseModel):
    stat: str
    top_n: int
    ranking: list[dict[str, Any]]  # team/country/city items vary in key names
    error: Optional[bool] = None
    message: Optional[str] = None


class CountryRankingItem(BaseModel):
    country: str
    matches: int


class CountryRankingResponse(BaseModel):
    stat: str
    top_n: int
    ranking: list[CountryRankingItem]


class CityRankingItem(BaseModel):
    city: str
    matches: int


class CityRankingResponse(BaseModel):
    stat: str
    top_n: int
    ranking: list[CityRankingItem]


# ===========================================================================
#  GET /tournaments  &  GET /tournament/{name}
# ===========================================================================

class TournamentListItem(BaseModel):
    tournament: str
    first_year: int
    last_year: int
    editions: int
    matches: int
    total_goals: int
    home_wins: int
    away_wins: int
    draws: int
    avg_goals: float
    unique_teams: int
    seasons: list[str] = Field(
        default_factory=list,
        description="Edition years, e.g. [\"1930\", \"1934\"] or [\"2018-2019\", \"2020-2021\"]",
    )

    model_config = ConfigDict(extra="allow")


class TopTeamItem(BaseModel):
    team: str
    wins: int


class TeamCategoryItem(BaseModel):
    team: str
    value: int


class TopTeams(BaseModel):
    """Multi-category team rankings (wins, losses, draws, goals for/against/diff)."""
    by_wins: list[TeamCategoryItem]
    by_losses: list[TeamCategoryItem]
    by_draws: list[TeamCategoryItem]
    by_goals_for: list[TeamCategoryItem]
    by_goals_against: list[TeamCategoryItem]
    by_goal_diff: list[TeamCategoryItem]


class TopCountryItem(BaseModel):
    country: str
    matches: int


class TopCityItem(BaseModel):
    city: str
    matches: int


class BiggestWinSummary(BaseModel):
    date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int

    model_config = ConfigDict(extra="allow")


class TournamentSummary(BaseModel):
    first_year: int
    last_year: int
    editions: int
    matches: int
    total_goals: int
    avg_goals_per_match: float
    home_wins: int
    away_wins: int
    draws: int
    unique_teams: int
    biggest_win: Optional[BiggestWinSummary] = None
    top_teams_by_wins: list[TopTeamItem]
    top_host_countries: list[TopCountryItem]
    top_host_cities: list[TopCityItem]


class TournamentYearlyItem(BaseModel):
    year: int
    matches: int
    goals: int
    avg_goals: float
    home_wins: int
    away_wins: int
    draws: int
    teams: int
    host_country: Optional[str] = None


class TournamentInfoResponse(BaseModel):
    tournament: str
    summary: TournamentSummary
    yearly: list[TournamentYearlyItem]
    error: Optional[bool] = None
    message: Optional[str] = None


# ===========================================================================
#  GET /tournament/{name}/season/{year}
# ===========================================================================

class SeasonMatchItem(BaseModel):
    date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    city: Optional[str] = None
    country: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class SeasonStandingItem(BaseModel):
    team: str
    matches_played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int

    model_config = ConfigDict(extra="allow")


class SeasonSummary(BaseModel):
    matches: int
    total_goals: int
    avg_goals_per_match: float
    home_wins: int
    away_wins: int
    draws: int
    unique_teams: int
    biggest_win: Optional[BiggestWinSummary] = None


class SeasonInfoResponse(BaseModel):
    tournament: str
    year: int
    host_country: Optional[str] = None
    summary: SeasonSummary
    standings: list[SeasonStandingItem]
    matches_list: list[SeasonMatchItem]
    error: Optional[bool] = None
    message: Optional[str] = None


# ===========================================================================
#  GET /cities  &  GET /city/{name}
# ===========================================================================

class CityListItem(BaseModel):
    city: str
    country: str
    matches: int
    total_goals: int
    home_wins: int
    away_wins: int
    draws: int
    unique_teams: int
    tournaments: int
    first_year: int
    last_year: int
    avg_goals: float

    model_config = ConfigDict(extra="allow")


class CitySummary(BaseModel):
    matches: int
    first_year: int
    last_year: int
    total_goals: int
    avg_goals_per_match: float
    home_wins: int
    away_wins: int
    draws: int
    unique_teams: int
    unique_tournaments: int
    biggest_win: Optional[BiggestWinSummary] = None
    top_teams_by_wins: list[TopTeamItem]
    top_teams: Optional[TopTeams] = None
    top_tournaments: list[dict[str, Any]] = Field(default_factory=list)


class CityInfoResponse(BaseModel):
    city: str
    country: str
    summary: CitySummary
    error: Optional[bool] = None
    message: Optional[str] = None


# ===========================================================================
#  GET /countries  &  GET /country/{name}
# ===========================================================================

class CountryListItem(BaseModel):
    country: str
    matches: int
    total_goals: int
    home_wins: int
    away_wins: int
    draws: int
    unique_teams: int
    tournaments: int
    cities: int
    first_year: int
    last_year: int
    avg_goals: float

    model_config = ConfigDict(extra="allow")


class CountrySummary(BaseModel):
    matches: int
    first_year: int
    last_year: int
    total_goals: int
    avg_goals_per_match: float
    home_wins: int
    away_wins: int
    draws: int
    unique_teams: int
    unique_tournaments: int
    unique_cities: int
    biggest_win: Optional[BiggestWinSummary] = None
    top_teams_by_wins: list[TopTeamItem]
    top_teams: Optional[TopTeams] = None
    top_tournaments: list[dict[str, Any]] = Field(default_factory=list)
    top_cities: list[dict[str, Any]] = Field(default_factory=list)


class CountryInfoResponse(BaseModel):
    country: str
    summary: CountrySummary
    error: Optional[bool] = None
    message: Optional[str] = None


# ===========================================================================
#  GET /health
# ===========================================================================

class HealthResponse(BaseModel):
    status: str
    data_loaded: bool


# ===========================================================================
#  GET /version
# ===========================================================================

class VersionResponse(BaseModel):
    version: str


# ===========================================================================
#  POST /reload
# ===========================================================================

class ReloadResponse(BaseModel):
    message: str
    status: str = "ok"
    matches_loaded: int
    goalscorers_loaded: int
    shootouts_loaded: int
    former_names_loaded: int


# ===========================================================================
#  GET /
# ===========================================================================

# ===========================================================================
#  GET /filters
# ===========================================================================

class FilterOptionsResponse(BaseModel):
    tournaments: list[str]
    countries: list[str]
    cities: list[str]
    teams: list[str]


# ===========================================================================
#  GET /
# ===========================================================================

class RootResponse(BaseModel):
    service: str
    status: str
    version: str
    endpoints: dict[str, str]
    available_stats: dict[str, str]
    filter_params: dict[str, str]
    data_loaded: bool
