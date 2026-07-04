export interface TeamItem {
  team: string;
  matches_played: number;
  goals_for: number;
  goals_against: number;
  gf_ga_ratio: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  win_rate: number;
  unique_countries: number;
  elo_rating: number | null;
  elo_ranking: number | null;
}

export interface SeriesStats {
  count: number;
  sum: number;
  mean: number | null;
  median: number | null;
  mode: number[];
  min: number | null;
  max: number | null;
  stdev: number | null;
  variance: number | null;
  skewness: number | null;
  kurtosis: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  iqr: number | null;
  range: number | null;
}

export interface YearlyRow {
  year: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  goals_for: number;
  goals_against: number;
}

export interface TeamDetail {
  team: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  win_rate: number;
  goals_for_stats?: SeriesStats;
  goals_against_stats?: SeriesStats;
  goal_diff_stats?: SeriesStats;
  biggest_wins: BiggestWin[];
  worst_defeats: BiggestWin[];
  yearly: YearlyRow[];
  matches_list: MatchItem[];
  error?: boolean;
  message?: string;
}

export interface MatchItem {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  tournament?: string;
  city?: string;
  country?: string;
  neutral?: boolean;
  shootout?: boolean;
}

export interface BiggestWin {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  goal_margin: number;
  tournament?: string;
  shootout?: boolean;
}

export interface TeamMatchesByYear {
  team: string;
  year: number;
  matches: number;
  matches_list: MatchItem[];
  error?: boolean;
  message?: string;
}

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

export interface TournamentYearlyRow {
  year: number;
  matches: number;
  goals: number;
  avg_goals: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  teams: number;
  host_country: string | null;
}

export interface TournamentTeamRow {
  team: string;
  matches_played: number;
  goals_for: number;
  goals_against: number;
  wins: number;
  losses: number;
  draws: number;
  goal_diff: number;
  win_loss_ratio: number;
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
    top_teams_by_wins: { team: string; value: number }[];
    top_teams: Record<string, { team: string; value: number }[]>;
    all_teams: TournamentTeamRow[];
    top_host_countries: { country: string; matches: number }[];
    top_host_cities: { city: string; matches: number }[];
  };
  yearly: TournamentYearlyRow[];
  error?: boolean;
  message?: string;
}

export interface TournamentSeasonDetail {
  tournament: string;
  year: number;
  host_country: string | null;
  summary: {
    matches: number;
    total_goals: number;
    avg_goals_per_match: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    unique_teams: number;
    biggest_win: BiggestWin | null;
  };
  standings: {
    team: string;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_diff: number;
    points: number;
  }[];
  matches_list: MatchItem[];
  error?: boolean;
  message?: string;
}

export interface HeadToHeadResult {
  team1: string;
  team2: string;
  matches: number;
  draws: number;
  matches_list: MatchItem[];
  total_goals_per_match_stats?: SeriesStats;
  error?: boolean;
  message?: string;
  [key: string]: unknown;
}
