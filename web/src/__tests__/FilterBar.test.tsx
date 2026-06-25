import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterBar } from "@/components/shared/FilterBar";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("teams=Brazil&tournaments=FIFA+World+Cup"),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/teams",
}));

const mockFilters = {
  teams: ["Brazil", "Argentina", "Germany"],
  tournaments: ["FIFA World Cup", "Copa América", "UEFA Euro"],
  countries: ["Brazil", "Italy", "England"],
};

describe("FilterBar", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFilters),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all filter sections by default", () => {
    render(<FilterBar />);
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
  });

  it("hides sections based on fields prop", () => {
    render(<FilterBar fields={{ teams: false, tournaments: false, countries: true, dates: true }} />);
    expect(screen.queryByText("Teams")).not.toBeInTheDocument();
    expect(screen.queryByText("Tournaments")).not.toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
  });

  it("shows selected chips", () => {
    render(<FilterBar />);
    expect(screen.getByText("Brazil")).toBeInTheDocument();
    expect(screen.getByText("FIFA World Cup")).toBeInTheDocument();
  });
});
