import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopList } from "@/components/shared/TopList";

const items = [
  { rank: 1, name: "Brazil", value: "76", href: "/teams/Brazil" },
  { rank: 2, name: "Germany", value: "69" },
  { rank: 3, name: "Argentina", value: "48", sub: "wins" },
];

describe("TopList", () => {
  it("renders the title", () => {
    render(<TopList title="Top Teams" items={items} />);
    expect(screen.getByText("Top Teams")).toBeInTheDocument();
  });

  it("renders all items with their names and values", () => {
    render(<TopList title="Test" items={items} />);
    expect(screen.getByText("Brazil")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("76")).toBeInTheDocument();
    expect(screen.getByText("69")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("renders rank numbers", () => {
    render(<TopList title="Test" items={items} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders links when href is provided", () => {
    render(<TopList title="Test" items={items} />);
    const link = screen.getByText("Brazil").closest("a");
    expect(link).toHaveAttribute("href", "/teams/Brazil");
  });

  it("does not render a link when href is not provided", () => {
    render(<TopList title="Test" items={items} />);
    const germany = screen.getByText("Germany");
    expect(germany.closest("a")).toBeNull();
  });

  it("renders sub text", () => {
    render(<TopList title="Test" items={items} />);
    expect(screen.getByText("wins")).toBeInTheDocument();
  });

  it("renders View All link when viewAllHref is provided", () => {
    render(
      <TopList title="Test" items={items} viewAllHref="/teams" />
    );
    expect(screen.getByText("View All →")).toBeInTheDocument();
    expect(screen.getByText("View All →").closest("a")).toHaveAttribute("href", "/teams");
  });

  it("escales bar widths relative to max value", () => {
    render(<TopList title="Test" items={items} />);
    // First item (Brazil, 76) should fill 100% since it's the max
    const bars = document.querySelectorAll("[class*='rounded-full']");
    expect(bars.length).toBeGreaterThanOrEqual(3);
    const firstBar = bars[1] as HTMLElement; // first bar after rank
    expect(firstBar.style.width).toBe("100%");
  });

  it("handles empty items array", () => {
    render(<TopList title="Empty" items={[]} />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
    // No rank numbers should be present
    expect(screen.queryByText("1")).toBeNull();
  });
});
