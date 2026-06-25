import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      expect(screen.getByText("3")).toBeInTheDocument(); // total matches
    });
    expect(screen.getByText("2")).toBeInTheDocument(); // wins
    expect(screen.getByText("1")).toBeInTheDocument(); // losses
    expect(screen.getByText("0")).toBeInTheDocument(); // draws
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

  it("renders client-side filter controls", async () => {
    render(<YearMatchesClient teamName="Brazil" year={2022} />);
    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Any opponent")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any tournament")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any country")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Any city")).toBeInTheDocument();
  });

  it("filters by opponent when selected", async () => {
    const user = userEvent.setup();
    render(<YearMatchesClient teamName="Brazil" year={2022} />);

    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });

    // Pick "Serbia" from the opponent dropdown
    const opponentInput = screen.getByPlaceholderText("Any opponent");
    await user.click(opponentInput);
    const serbiaOption = await screen.findByText("Serbia");
    await user.click(serbiaOption);

    // Should now show only 1 match (Brazil-Serbia)
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument(); // 1 total match
    });
    expect(screen.getByText("Serbia")).toBeInTheDocument();
    expect(screen.queryByText("Switzerland")).not.toBeInTheDocument();
    expect(screen.queryByText("Cameroon")).not.toBeInTheDocument();
  });

  it("filters by tournament", async () => {
    const user = userEvent.setup();
    render(<YearMatchesClient teamName="Brazil" year={2022} />);

    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });

    // Open tournament dropdown
    const tournamentInput = screen.getByPlaceholderText("Any tournament");
    await user.click(tournamentInput);

    // The dropdown list should appear with "FIFA World Cup"
    await waitFor(() => {
      // The <li> inside the open dropdown contains "FIFA World Cup"
      const dropdownItems = document.querySelectorAll("ul li");
      const found = Array.from(dropdownItems).some(
        (li) => li.textContent === "FIFA World Cup",
      );
      expect(found).toBe(true);
    });
  });

  it("shows 'Clear filters' button when opponent filter is active", async () => {
    const user = userEvent.setup();
    render(<YearMatchesClient teamName="Brazil" year={2022} />);

    await waitFor(() => {
      expect(screen.getByText("Brazil — 2022 Matches")).toBeInTheDocument();
    });

    // No clear button initially
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();

    // Select an opponent — "Serbia" appears in both dropdown and table,
    // so pick the first <li> (dropdown) element
    const opponentInput = screen.getByPlaceholderText("Any opponent");
    await user.click(opponentInput);
    const allSerbia = await screen.findAllByText("Serbia");
    // The dropdown <li> is the first one in DOM order
    await user.click(allSerbia[0]);

    // Clear button should now appear
    await waitFor(() => {
      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });
  });
});
