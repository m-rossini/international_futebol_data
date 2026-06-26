import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { YearlyChart } from "@/components/shared/YearlyChart";

const data = [
  { year: 2020, wins: 3, losses: 1, draws: 1 },
  { year: 2021, wins: 7, losses: 3, draws: 2 },
  { year: 2022, wins: 4, losses: 2, draws: 2 },
];

describe("YearlyChart", () => {
  it("renders an svg with the chart aria label", () => {
    render(<YearlyChart data={data} />);
    expect(
      screen.getByRole("img", { name: "Wins / Draws / Losses per year" }),
    ).toBeInTheDocument();
  });

  it("shows year labels on the x-axis", () => {
    render(<YearlyChart data={data} />);
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getByText("2022")).toBeInTheDocument();
  });

  it("renders colored dots for wins/draws/losses", () => {
    const { container } = render(<YearlyChart data={data} />);
    // Three dots per year (wins, draws, losses) × 3 years = 9 circles
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(9);
    // Verify colors
    const fills = new Set(Array.from(circles).map((c) => c.getAttribute("fill")));
    expect(fills.has("#22c55e")).toBe(true); // wins green
    expect(fills.has("#f59e0b")).toBe(true); // draws amber
    expect(fills.has("#ef4444")).toBe(true); // losses red
  });

  it("renders the legend with Wins, Draws, Losses", () => {
    render(<YearlyChart data={data} />);
    expect(screen.getByText("Wins")).toBeInTheDocument();
    expect(screen.getByText("Draws")).toBeInTheDocument();
    expect(screen.getByText("Losses")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<YearlyChart data={[]} />);
    expect(screen.getByText("No yearly data available")).toBeInTheDocument();
  });

  it("sorts bars by year ascending regardless of input order", () => {
    const unsorted = [
      { year: 2022, wins: 1, losses: 0, draws: 0 },
      { year: 2020, wins: 1, losses: 0, draws: 0 },
      { year: 2021, wins: 1, losses: 0, draws: 0 },
    ];
    render(<YearlyChart data={unsorted} />);
    const texts = screen.getAllByText(/^20\d{2}$/);
    const years = texts.map((el) => Number(el.textContent));
    expect(years).toEqual([2020, 2021, 2022]);
  });
});
