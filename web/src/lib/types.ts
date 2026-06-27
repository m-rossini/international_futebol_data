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
}

export interface BiggestWin {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  goal_margin: number;
  tournament?: string;
}

export interface TeamMatchesByYear {
  team: string;
  year: number;
  matches: number;
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
