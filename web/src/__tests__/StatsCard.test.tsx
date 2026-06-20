import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/shared/StatsCard";

describe("StatsCard", () => {
  it("renders label and value", () => {
    render(<StatsCard label="Matches" value="1,234" />);
    expect(screen.getByText("Matches")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    render(<StatsCard label="Goals" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders sub text with default muted color", () => {
    render(<StatsCard label="Wins" value="50" sub="55.5%" />);
    expect(screen.getByText("55.5%")).toBeInTheDocument();
    // Default subColor is "muted" → text-[#ADB5BD]
    const sub = screen.getByText("55.5%");
    expect(sub.className).toContain("text-[#ADB5BD]");
  });

  it("renders sub text with success color", () => {
    render(<StatsCard label="Win Rate" value="75%" sub="+5%" subColor="success" />);
    const sub = screen.getByText("+5%");
    expect(sub.className).toContain("text-[#198754]");
  });

  it("renders sub text with danger color", () => {
    render(<StatsCard label="Loss Rate" value="25%" sub="-3%" subColor="danger" />);
    const sub = screen.getByText("-3%");
    expect(sub.className).toContain("text-[#DC3545]");
  });

  it("renders sub text with warning color", () => {
    render(<StatsCard label="Draw Rate" value="10%" sub="0%" subColor="warning" />);
    const sub = screen.getByText("0%");
    expect(sub.className).toContain("text-[#FD7E14]");
  });

  it("does not render sub when not provided", () => {
    const { container } = render(<StatsCard label="Total" value="100" />);
    // Sub text uses mt-1 class — verify none rendered
    const subs = container.querySelectorAll(".mt-1");
    expect(subs.length).toBe(0);
  });
});
