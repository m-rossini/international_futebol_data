import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TeamsClient } from "@/app/teams/teams-client";

const mockTeams = [
  { team: "Brazil", matches_played: 100, wins: 70, losses: 10, draws: 20, win_rate: 70.0, unique_countries: 15 },
  { team: "Germany", matches_played: 90, wins: 60, losses: 15, draws: 15, win_rate: 66.67, unique_countries: 12 },
];

const mockFilters = { teams: ["Brazil", "Germany"], tournaments: [], countries: [] };

let mockSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: vi.fn() }),
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

  it("shows error state on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<TeamsClient />);
    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });
});
