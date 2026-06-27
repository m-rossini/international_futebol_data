import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

// Mock next/navigation hooks used by AutocompleteInput
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/",
}));

describe("HomePage", () => {
  beforeEach(() => {
    // Mock fetch for the filters API
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teams: [], tournaments: [], countries: [] }),
    });
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the hero title and subtitle", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "International Football Statistics" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore teams, tournaments/)
    ).toBeInTheDocument();
  });

  it("renders the Default Preferences card", () => {
    render(<HomePage />);
    expect(screen.getByText("Default Preferences")).toBeInTheDocument();
    expect(screen.getByText("Default Team")).toBeInTheDocument();
    expect(screen.getByText("Default Tournament")).toBeInTheDocument();
  });

  it("renders the navigation cards", () => {
    render(<HomePage />);
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Head to Head")).toBeInTheDocument();
    expect(screen.queryByText("Tournaments")).not.toBeInTheDocument();
  });

  it("renders the Save Preferences button", () => {
    render(<HomePage />);
    const btn = screen.getByRole("button", { name: /Save Preferences/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled(); // Disabled when no checkbox is checked
  });
});
