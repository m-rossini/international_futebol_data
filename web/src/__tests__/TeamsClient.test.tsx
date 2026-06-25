import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamsClient } from "@/app/teams/teams-client";

const mockTeams = [
  { team: "Brazil", matches_played: 100, wins: 70, losses: 10, draws: 20, win_rate: 70.0, unique_countries: 15 },
  { team: "Germany", matches_played: 90, wins: 60, losses: 15, draws: 15, win_rate: 66.67, unique_countries: 12 },
];

const mockFilters = { teams: ["Brazil", "Germany"], tournaments: [], countries: [] };

let mockSearchParams = new URLSearchParams("");
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/teams",
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
      json: () => Promise.resolve(mockTeams),
    });
  });
}

describe("TeamsClient", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("");
    mockPush.mockClear();
    mockReplace.mockClear();
    mockFetchSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the heading", async () => {
    render(<TeamsClient />);
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
  });

  it("renders team data after loading", async () => {
    render(<TeamsClient />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });
    expect(screen.getByText("Germany")).toBeInTheDocument();
  });

  it("filters teams client-side by selected team names", async () => {
    mockSearchParams = new URLSearchParams("teams=Brazil");

    render(<TeamsClient />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });
    expect(screen.queryByText("Germany")).not.toBeInTheDocument();
  });

  it("filters teams by minimum matches played", async () => {
    mockSearchParams = new URLSearchParams("min_matches=95");

    render(<TeamsClient />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });
    expect(screen.queryByText("Germany")).not.toBeInTheDocument();
  });

  it("navigates to team detail on row click with filters", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("tournaments=World+Cup");

    render(<TeamsClient />);
    await waitFor(() => {
      expect(screen.getByText("Brazil")).toBeInTheDocument();
    });

    // Click the "Brazil" cell inside the table row (not the filter chip)
    const rows = screen.getAllByRole("row");
    const brazilRow = rows.find((row) => row.textContent?.includes("Brazil"));
    expect(brazilRow).toBeDefined();
    await user.click(brazilRow!);
    expect(mockPush).toHaveBeenCalledWith(
      "/teams/Brazil?tournaments=World+Cup"
    );
  });

  it("shows error state on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<TeamsClient />);
    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });
});
