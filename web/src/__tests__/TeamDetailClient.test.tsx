import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamDetailClient } from "@/app/teams/[name]/team-detail-client";

const mockTeamDetail = {
  team: "Brazil",
  matches_played: 200,
  wins: 150,
  draws: 20,
  losses: 30,
  win_rate: 75.0,
  goals_for_stats: {
    count: 50, sum: 120, mean: 2.4, median: 2, mode: [2],
    min: 0, max: 7, stdev: 1.2, variance: 1.44,
    skewness: 0.3, kurtosis: -0.2, p25: 1, p50: 2, p75: 3,
    iqr: 2, range: 7,
  },
  goals_against_stats: {
    count: 50, sum: 40, mean: 0.8, median: 1, mode: [0],
    min: 0, max: 3, stdev: 0.9, variance: 0.81,
    skewness: 0.5, kurtosis: -0.3, p25: 0, p50: 1, p75: 1,
    iqr: 1, range: 3,
  },
  goal_diff_stats: {
    count: 50, sum: 80, mean: 1.6, median: 1, mode: [1],
    min: -3, max: 7, stdev: 1.5, variance: 2.25,
    skewness: 0.7, kurtosis: 0.1, p25: 0, p50: 1, p75: 3,
    iqr: 3, range: 10,
  },
  yearly: [
    { year: 2022, matches_played: 15, wins: 8, losses: 2, draws: 5, goals_for: 38, goals_against: 10 },
    { year: 2021, matches_played: 12, wins: 6, losses: 4, draws: 2, goals_for: 22, goals_against: 14 },
  ],
  matches_list: [
    { date: "2022-11-24", home_team: "Brazil", away_team: "Serbia", home_score: 2, away_score: 0 },
    { date: "2022-11-28", home_team: "Brazil", away_team: "Switzerland", home_score: 1, away_score: 0 },
    { date: "2022-12-02", home_team: "Cameroon", away_team: "Brazil", home_score: 1, away_score: 0 },
    { date: "2022-12-05", home_team: "Brazil", away_team: "South Korea", home_score: 4, away_score: 1 },
    { date: "2022-12-09", home_team: "Croatia", away_team: "Brazil", home_score: 1, away_score: 1 },
  ],
};

const mockFilters = { teams: ["Argentina"], tournaments: [], countries: [] };

let mockSearchParams = new URLSearchParams("");
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/teams/Brazil",
}));

function mockFetchSuccess() {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/filters")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFilters),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTeamDetail),
    });
  });
}

describe("TeamDetailClient", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
    mockPush.mockClear();
    mockReplace.mockClear();
    mockFetchSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the team name heading", async () => {
    render(<TeamDetailClient teamName="Brazil" />);
    expect(screen.getByRole("heading", { name: "Brazil" })).toBeInTheDocument();
  });

  it("renders summary stat cards after loading", async () => {
    render(<TeamDetailClient teamName="Brazil" />);
    await waitFor(() => {
      expect(screen.getByText("150")).toBeInTheDocument(); // wins
    });
    expect(screen.getByText("30")).toBeInTheDocument(); // losses
    expect(screen.getByText("75.0%")).toBeInTheDocument(); // win rate
    expect(screen.getByText("20")).toBeInTheDocument(); // draws
  });

  it("renders yearly chart before yearly breakdown table", async () => {
    render(<TeamDetailClient teamName="Brazil" />);

    // Wait for the yearly breakdown heading to appear (data is loaded)
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Yearly Breakdown" })).toBeInTheDocument();
    });

    // Charts section heading
    expect(screen.getByRole("heading", { name: "Charts" })).toBeInTheDocument();
    // Chart sub-heading
    expect(screen.getByRole("heading", { name: "Matches per Year" })).toBeInTheDocument();
    // Chart SVG
    expect(screen.getByRole("img", { name: "Wins / Losses / Draws per year" })).toBeInTheDocument();
    // "2022" appears in both chart labels and table — should exist at least twice
    expect(screen.getAllByText("2022").length).toBeGreaterThanOrEqual(2);
  });

  it("carries over filters from search params", async () => {
    mockSearchParams = new URLSearchParams("tournaments=World+Cup");

    render(<TeamDetailClient teamName="Brazil" />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });

    // Verify the fetch called the team endpoint with filters
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/proxy/team/Brazil?tournaments=World+Cup")
    );
  });

  it("filters bar hides team selection", async () => {
    render(<TeamDetailClient teamName="Brazil" />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });

    // The "All teams" placeholder from AutocompleteInput should NOT appear
    expect(screen.queryByPlaceholderText("All teams")).not.toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<TeamDetailClient teamName="Brazil" />);
    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });

  it("back button navigates to teams list with filters", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("tournaments=World+Cup");

    render(<TeamDetailClient teamName="Brazil" />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back to teams"));
    expect(mockPush).toHaveBeenCalledWith("/teams?tournaments=World+Cup");
  });
});
