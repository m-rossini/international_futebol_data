import { describe, it, expect } from "vitest";
import { formatNumber, winRateClass, getFlagUrl, cn } from "@/lib/utils";

describe("formatNumber", () => {
  it("formats integers with locale separators", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1000000)).toBe("1,000,000");
    expect(formatNumber(0)).toBe("0");
  });

  it("returns em-dash for null", () => {
    expect(formatNumber(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatNumber(undefined)).toBe("—");
  });

  it("returns em-dash for NaN", () => {
    expect(formatNumber(NaN)).toBe("—");
  });

  it("returns em-dash for non-number types at runtime", () => {
    // @ts-expect-error testing runtime behavior
    expect(formatNumber("abc")).toBe("—");
  });
});

describe("winRateClass", () => {
  it('returns "badge-win" for rates >= 60', () => {
    expect(winRateClass(60)).toBe("badge-win");
    expect(winRateClass(75)).toBe("badge-win");
    expect(winRateClass(100)).toBe("badge-win");
  });

  it('returns "badge-draw" for rates >= 45 and < 60', () => {
    expect(winRateClass(45)).toBe("badge-draw");
    expect(winRateClass(50)).toBe("badge-draw");
    expect(winRateClass(59.9)).toBe("badge-draw");
  });

  it('returns "badge-loss" for rates < 45', () => {
    expect(winRateClass(44)).toBe("badge-loss");
    expect(winRateClass(0)).toBe("badge-loss");
    expect(winRateClass(10)).toBe("badge-loss");
  });
});

describe("getFlagUrl", () => {
  it("returns the correct flagcdn URL for known countries", () => {
    expect(getFlagUrl("Brazil")).toBe("https://flagcdn.com/w40/br.png");
    expect(getFlagUrl("Germany", 24)).toBe("https://flagcdn.com/w24/de.png");
    expect(getFlagUrl("United States")).toBe("https://flagcdn.com/w40/us.png");
  });

  it("handles case-insensitive lookup", () => {
    expect(getFlagUrl("BRAZIL")).toBe("https://flagcdn.com/w40/br.png");
    expect(getFlagUrl("england")).toBe("https://flagcdn.com/w40/gb-eng.png");
  });

  it("falls back to first two letters for unknown countries", () => {
    expect(getFlagUrl("Wonderland")).toBe("https://flagcdn.com/w40/wo.png");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts via twMerge", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});
