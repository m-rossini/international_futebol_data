import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { YearMatchesClient } from "@/app/teams/[name]/[year]/year-matches-client";

const mockMatches = {
  team: "Brazil",
  year: 2022,
  matches: 3,
  matches_list: [
    {
      date: "2022-11-24 00:00:00",
      home_team: "Brazil",
      away_team: "Serbia",
      home_score: 2,
      away_score: 0,
      tournament: "FIFA World Cup",
      city: "Lusail",
      country: "Qatar",
      neutral: true,
    },
    {
      date: "2022-11-28 00:00:00",
      home_team: "Brazil",
      away_team: "Switzerland",
      home_score: 1,
      away_score: 0,
      tournament: "FIFA World Cup",
      city: "Doha",
      country: "Qatar",
      neutral: true,
    },
    {
      date: "2022-12-02 00:00:00",
      home_team: "Cameroon",
      away_team: "Brazil",
      home_score: 1,
      away_score: 0,
      tournament: "FIFA World Cup",
      city: "Lusail",
      country: "Qatar",
      neutral: true,
    },
  ],
};

let mockSearchParams = new URLSearchParams("");
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/teams/Brazil/2022",
}));

function mockFetchSuccess(data: object = mockMatches) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe("YearMatchesClient", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
    mockPush.mockClear();
    mockFetchSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the heading with team and year", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    expect(
      screen.getByRole("heading", { name: "Brazil — 2022 Matches" }),
    ).toBeInTheDocument();
  });

  it("shows the back button", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    expect(screen.getByText("Back to Brazil")).toBeInTheDocument();
  });

  it("displays summary stat cards after loading", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText("Matches")).toBeInTheDocument();
    });
    // Verify match stat cards are present
    expect(screen.getByText("Wins")).toBeInTheDocument();
    expect(screen.getByText("Losses")).toBeInTheDocument();
    expect(screen.getByText("Draws")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    // Verify goal stat cards are present (also appear in chart legend)
    expect(screen.getAllByText("Goals For").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Goals Against").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Goal Diff")).toBeInTheDocument();
  });

  it("displays match rows in the table", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getAllByText("FIFA World Cup").length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getAllByText("Lusail").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Doha")).toBeInTheDocument();
    expect(screen.getByText("Serbia")).toBeInTheDocument();
    expect(screen.getByText("Switzerland")).toBeInTheDocument();
    expect(screen.getByText("Cameroon")).toBeInTheDocument();
  });

  it("shows 'No matches found' when list is empty", async () => {
    mockFetchSuccess({ team: "Brazil", year: 2000, matches: 0, matches_list: [] });
    render(<YearMatchesClient teamName="Brazil" year={2000} />);
    await waitFor(() => {
      expect(screen.getByText("No matches found for this year.")).toBeInTheDocument();
    });
  });

  it("shows error on API failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("shows error on API error response", async () => {
    mockFetchSuccess({ error: true, message: "Team 'Unknown' not found" });
    render(<YearMatchesClient teamName="Unknown" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText(/Team 'Unknown' not found/)).toBeInTheDocument();
    });
  });

  it("sends filter params to the API", async () => {
    mockSearchParams = new URLSearchParams("tournaments=World+Cup");
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/proxy/team/Brazil/matches/2022?tournaments=World+Cup",
      ),
    );
  });

  it("renders filter controls: opponent, tournament, country, city, date range", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Any opponent")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any tournament")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any country")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any city")).toBeInTheDocument();
    // Date range inputs
    const dateInputs = screen.getAllByDisplayValue("");
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it("does not show clear button when no filter is active", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
  });

  it("shows correct date format in table (no Invalid Date)", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });
    // Date format: "24 Nov 2022"
    expect(screen.getByText("24 Nov 2022")).toBeInTheDocument();
    expect(screen.getByText("28 Nov 2022")).toBeInTheDocument();
    expect(screen.getByText("02 Dec 2022")).toBeInTheDocument();
  });
});
