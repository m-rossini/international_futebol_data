// TypeScript types matching the actual FastAPI responses

// ── Filter params ──
export interface FilterParams {
  tournaments?: string[];
  countries?: string[];
  date_from?: string;
  date_to?: string;
}

// ── Filter options (pre-populated dropdown values) ──
export interface FilterOptions {
  tournaments: string[];
  countries: string[];
  cities: string[];
}

// ── Shared ──
export interface StatsSeries {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  stdev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  p25: number;
  p50: number;
  p75: number;
  iqr: number;
  range: number;
}

export interface BiggestWin {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  tournament?: string;
  city?: string;
}

export interface TeamWinEntry {
  team: string;
  wins: number;
}

export interface TeamCategoryItem {
  team: string;
  value: number;
}

export interface TournamentTopTeams {
  by_wins: TeamCategoryItem[];
  by_losses: TeamCategoryItem[];
  by_draws: TeamCategoryItem[];
  by_goals_for: TeamCategoryItem[];
  by_goals_against: TeamCategoryItem[];
  by_goal_diff: TeamCategoryItem[];
}

export interface CityMatchEntry {
  city: string;
  matches: number;
}

// ── Summary (dashboard) ──
export interface SummaryResponse {
  results: {
    total_matches: number;
    date_range: { from: string; to: string };
    tournaments_count: number;
    most_common_tournament: string;
    unique_home_teams: number;
    unique_away_teams: number;
    total_goals: number;
    avg_goals_per_match: number;
    home_advantage: {
      total_matches: number;
      home_wins: number;
      home_win_pct: number;
      draws: number;
      draw_pct: number;
      away_wins: number;
      away_win_pct: number;
    };
    goal_distribution: {
      home_score: StatsSeries;
      away_score: StatsSeries;
    };
    match_distribution: {
      matches_per_year: Record<string, number>;
      matches_per_tournament: Record<string, number>;
    };
  };
  goalscorers: {
    total_goals_recorded: number;
    unique_scorers: number;
    unique_teams_scored_for: number;
    date_range: { from: string; to: string };
    own_goals: number;
  };
}

// ── Rankings / Most ──
// The API returns { stat, top_n, ranking: [...], error, message }
// Each item in ranking has the stat name (or mapped name) as its value field
export interface TeamRankingResponse {
  stat: string;
  top_n: number;
  ranking: Array<Record<string, unknown>>;
  error: string | null;
  message: string | null;
}

export interface TeamRankingItem {
  rank: number;
  team: string;
  value: number;
}

// ── Biggest wins ──
export interface BiggestWinItem {
  rank: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  goal_diff: number;
  tournament: string;
}

// ── Goals per year ──
export interface GoalsPerYearItem {
  year: number;
  goals: number;
  matches: number;
  ratio: number;
}

// ── Tournaments ──
export interface TournamentListItem {
  tournament: string;
  first_year: number;
  last_year: number;
  editions: number;
  matches: number;
  total_goals: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  avg_goals: number;
  unique_teams: number;
  seasons: string[];
}

export interface TournamentDetail {
  tournament: string;
  summary: {
    first_year: number;
    last_year: number;
    editions: number;
    matches: number;
    total_goals: number;
    avg_goals_per_match: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    unique_teams: number;
    biggest_win: BiggestWin | null;
    top_teams_by_wins: TeamWinEntry[];
    top_teams: TournamentTopTeams;
  };
  yearly: Array<{
    year: number;
    matches: number;
    goals: number;
    avg_goals: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    teams: number;
    host_country: string;
  }>;
}

// ── Teams ──
export interface TeamYearlyItem {
  year: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  goals_for: number;
  goals_against: number;
}

export interface TeamStats {
  team: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: number;
  goals_for_stats: StatsSeries;
  goals_against_stats: StatsSeries;
  goal_diff_stats: StatsSeries;
  yearly: TeamYearlyItem[];
}

export interface TeamListItem {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

// ── Head-to-Head ──
export interface HeadToHeadResponse {
  team1: string;
  team2: string;
  team1_wins: number;
  team2_wins: number;
  draws: number;
  total_matches: number;
  team1_goals: number;
  team2_goals: number;
  team1_win_rate: number;
  team2_win_rate: number;
  team1_avg_goals: number;
  team2_avg_goals: number;
  total_goals_per_match_stats: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  };
}

// ── Countries ──
export interface CountryListItem {
  country: string;
  matches: number;
  total_goals: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  unique_teams: number;
  tournaments: number;
  cities: number;
  first_year: number;
  last_year: number;
  avg_goals: number;
}

export interface CountryDetail {
  country: string;
  summary: {
    matches: number;
    first_year: number;
    last_year: number;
    total_goals: number;
    avg_goals_per_match: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    unique_teams: number;
    unique_tournaments: number;
    unique_cities: number;
    biggest_win: (BiggestWin & { city?: string }) | null;
    top_teams_by_wins: TeamWinEntry[];
    top_cities: Array<{ city: string; matches: number }>;
    top_tournaments: Array<{ tournament: string; matches: number }>;
  };
}

// ── Cities ──
export interface CityListItem {
  city: string;
  country: string;
  matches: number;
  total_goals: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  unique_teams: number;
  tournaments: number;
  first_year: number;
  last_year: number;
  avg_goals: number;
}

export interface CityDetail {
  city: string;
  country: string;
  summary: {
    matches: number;
    first_year: number;
    last_year: number;
    total_goals: number;
    avg_goals_per_match: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    unique_teams: number;
    unique_tournaments: number;
    biggest_win: BiggestWin | null;
    top_teams_by_wins: TeamWinEntry[];
    top_tournaments: Array<{ tournament: string; matches: number }>;
  };
}

// ── Top scorers ──
export interface TopScorerItem {
  rank: number;
  player: string;
  goals: number;
}

export interface TopScorersResponse {
  scorers: TopScorerItem[];
  top_n: number;
}

// ── Season detail ──
export interface SeasonMatchItem {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  city?: string;
  country?: string;
}

export interface SeasonStandingItem {
  team: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

export interface SeasonDetail {
  tournament: string;
  year: number;
  host_country?: string;
  summary: {
    matches: number;
    total_goals: number;
    avg_goals_per_match: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    unique_teams: number;
    biggest_win: {
      date: string;
      home_team: string;
      away_team: string;
      home_score: number;
      away_score: number;
    } | null;
  };
  standings: SeasonStandingItem[];
  matches_list: SeasonMatchItem[];
}
