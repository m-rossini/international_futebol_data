import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { YearlyChart } from "@/components/shared/YearlyChart";

const data = [
  { year: 2020, value: 5 },
  { year: 2021, value: 12 },
  { year: 2022, value: 8 },
];

describe("YearlyChart", () => {
  it("renders an svg with the chart aria label", () => {
    render(<YearlyChart data={data} />);
    expect(screen.getByRole("img", { name: "Matches per year" })).toBeInTheDocument();
  });

  it("shows year labels on the x-axis", () => {
    render(<YearlyChart data={data} />);
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getByText("2022")).toBeInTheDocument();
  });

  it("shows value labels above bars", () => {
    render(<YearlyChart data={data} />);
    // "5" and "8" are unique; "12" appears as both bar label and Y-axis tick
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getAllByText("12").length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty state when no data", () => {
    render(<YearlyChart data={[]} />);
    expect(screen.getByText("No yearly data available")).toBeInTheDocument();
  });

  it("sorts bars by year ascending regardless of input order", () => {
    const unsorted = [
      { year: 2022, value: 3 },
      { year: 2020, value: 1 },
      { year: 2021, value: 2 },
    ];
    render(<YearlyChart data={unsorted} />);
    const texts = screen.getAllByText(/^20\d{2}$/);
    const years = texts.map((el) => Number(el.textContent));
    expect(years).toEqual([2020, 2021, 2022]);
  });
});
