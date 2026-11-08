export interface TeamItem {
  team: string;
  matches_played: number;
  goals_for: number;
  goals_against: number;
  gf_ga_ratio: number;
  avg_gf: number;
  avg_ga: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  win_rate: number;
  loss_rate: number;
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

export interface MatchGoalScorer {
  team: string;
  scorer: string;
  minute: number | null;
  own_goal: boolean;
  penalty: boolean;
}

export interface MatchShootoutInfo {
  winner: string;
  first_shooter?: string | null;
}

export interface MatchDetail {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  tournament?: string;
  city?: string;
  country?: string;
  scorers: MatchGoalScorer[];
  shootout?: MatchShootoutInfo | null;
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
  win_loss_ratio: number | null;
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

export interface TournamentMatchesResponse {
  tournament: string;
  total: number;
  limit: number;
  offset: number;
  matches: MatchItem[];
  error?: boolean;
  message?: string;
}

export interface ConfederationListItem {
  name: string;
  count: number;
  countries: string[];
  teams: string[];
}

export interface ConfederationDetail {
  confederation: string;
  countries: string[];
  teams: string[];
  total_matches: number;
  total_goals: number;
  unique_teams: number;
  tournaments: string[];
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

export interface SimulationResult {
  team1: string;
  team2: string;
  team1_win_prob: number;
  draw_prob: number;
  team2_win_prob: number;
  team1_expected_goals: number;
  team2_expected_goals: number;
  n_simulations: number;
  score_histogram: Record<string, number>;
  most_likely_score: string;
  method: string;
  rho: number;
  n_matches_used: number;
  error?: string;
}

export interface YearOverviewItem {
  year: number;
  matches: number;
  goals: number;
  avg_goals: number;
  countries: number;
  cities: number;
  largest_margin: number;
  most_goals_match: number;
  goals_histogram: Record<string, number>;
}

export interface YearDetail extends YearOverviewItem {
  matches_list: MatchItem[];
}

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

export interface CountrySummary {
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
  biggest_win: BiggestWin | null;
  top_teams_by_wins: { team: string; value: number }[];
  top_tournaments: { tournament: string; matches: number }[];
  top_cities: { city: string; matches: number }[];
}

export interface CountryDetail {
  country: string;
  summary: CountrySummary;
}

export interface CitySummary {
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
  top_teams_by_wins: { team: string; value: number }[];
  top_tournaments: { tournament: string; matches: number }[];
}

export interface CityDetail {
  city: string;
  country: string;
  summary: CitySummary;
}

export interface PlayerListItem {
  player_id: string;
  name: string;
  teams: string[];
  goals: number;
  matches: number;
  first_year: number | null;
  last_year: number | null;
  tournaments: string[];
}

export interface PlayerCareerRow {
  year: number;
  goals: number;
  matches: number;
  teams: string[];
  tournaments: string[];
}

export interface PlayerSummary {
  teams: string[];
  goals: number;
  matches: number;
  first_year: number | null;
  last_year: number | null;
  tournaments: string[];
}

export interface PlayerDetailResponse {
  player_id: string;
  name: string;
  summary: PlayerSummary;
  career: PlayerCareerRow[];
  tournaments: string[];
  top_teams: { team: string; goals: number }[];
}

export interface SquadPlayer {
  player_name: string;
  shirt_no: number | null;
  position: string | null;
  captain: boolean;
}

export interface SquadTeam {
  team: string;
  xi: SquadPlayer[];
  bench: SquadPlayer[];
}

export interface SquadMatchItem {
  match_date: string;
  home_team: string;
  away_team: string;
}

export interface SquadDetailResponse {
  match_date: string;
  home_team: string;
  away_team: string;
  squads: SquadTeam[];
}

export interface StatsBombShot {
  player_name: string | null;
  team: string | null;
  minute: number | null;
  x: number | null;
  y: number | null;
  xg: number | null;
  body_part: string | null;
  outcome: string | null;
}

export interface StatsBombShotsResponse {
  match_id: string;
  shots: StatsBombShot[];
  total_shots: number;
}

export interface StatsBombEventsResponse {
  matches_with_events: number;
  total_events: number;
  shots: number;
}

export interface FormerNameItem {
  current: string;
  former: string;
  start_date: string | null;
  end_date: string | null;
}

export interface FormerNamesResponse {
  total: number;
  chains: FormerNameItem[];
}
