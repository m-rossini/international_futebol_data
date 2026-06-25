import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the welcome title", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Welcome to International Football Statistics" })
    ).toBeInTheDocument();
  });
});
