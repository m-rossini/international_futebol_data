// TypeScript types matching the FastAPI Pydantic models

export interface FilterParams {
  tournaments?: string[];
  countries?: string[];
  date_from?: string;
  date_to?: string;
}

export interface SeriesStats {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  skew: number;
  iqr: number;
}

export interface Distribution {
  value: number;
  label: string;
}

// ── Summary ──
export interface SummaryResponse {
  results_metadata: {
    total_matches: number;
    total_goals: number;
    total_tournaments: number;
    total_countries: number;
    total_teams: number;
    unique_scorers: number;
    home_win_pct: number;
    away_win_pct: number;
    draw_pct: number;
    total_home_goals: number;
    total_away_goals: number;
    avg_goals_per_match: number;
    tournament_distribution: Record<string, number>;
    country_distribution: Record<string, number>;
    match_distribution: Record<string, number>;
    goal_distribution: Distribution[];
    win_distribution: Record<string, number>;
    goals_per_match_stats: SeriesStats;
    home_goals_stats: SeriesStats;
    away_goals_stats: SeriesStats;
    shootouts: {
      total_shootouts: number;
      home_wins: number;
      away_wins: number;
      winner_distribution: Distribution[];
    };
    former_names: Record<string, string[]>;
  };
}

// ── Teams ──
export interface TeamStats {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  loss_rate: number;
  draw_rate: number;
  goals_for: number;
  goals_against: number;
  avg_goals_per_match: number;
  biggest_win: { score: string; opponent: string; date: string } | null;
  biggest_loss: { score: string; opponent: string; date: string } | null;
  goals_for_stats: SeriesStats;
  goals_against_stats: SeriesStats;
  goal_differential: number;
}

export interface TeamListItem {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

// ── H2H ──
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
  total_goals_per_match_stats: SeriesStats;
}

// ── Tournaments ──
export interface TournamentListItem {
  tournament: string;
  matches: number;
  goals: number;
  first_year: number;
  last_year: number;
  teams: number;
  seasons: number;
  avg_goals_per_match: number;
}

export interface TournamentDetail {
  tournament: string;
  matches: number;
  goals: number;
  first_year: number;
  last_year: number;
  seasons: number;
  teams: number;
  avg_goals_per_match: number;
  home_win_pct: number;
  away_win_pct: number;
  draw_pct: number;
  yearly_breakdown: Array<{
    year: number;
    matches: number;
    goals: number;
    avg: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    hosts: string[];
    top_teams: Record<string, number>;
  }>;
  top_hosts: Record<string, number>;
  top_teams: Record<string, number>;
}

// ── Countries ──
export interface CountryListItem {
  country: string;
  matches: number;
  goals: number;
  cities: number;
  first_match: string;
  last_match: string;
}

export interface CountryDetail {
  country: string;
  matches: number;
  goals: number;
  cities: number;
  first_match: string;
  last_match: string;
  biggest_win: { score: string; teams: string; date: string } | null;
  top_tournaments: Record<string, number>;
  top_teams: Record<string, number>;
  top_cities: Record<string, number>;
}

// ── Cities ──
export interface CityListItem {
  city: string;
  country: string;
  matches: number;
  goals: number;
  tournaments: number;
}

export interface CityDetail {
  city: string;
  country: string;
  matches: number;
  goals: number;
  tournaments: number;
  biggest_win: { score: string; teams: string; date: string } | null;
  top_teams: Record<string, number>;
  top_tournaments: Record<string, number>;
}

// ── Rankings ──
export interface TeamRankingItem {
  rank: number;
  team: string;
  value: number;
}

export interface TeamRankingResponse {
  stat: string;
  top_n: number;
  teams: TeamRankingItem[];
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
