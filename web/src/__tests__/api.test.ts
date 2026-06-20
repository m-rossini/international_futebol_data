import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSummary, getTeams, getTeam, getTournaments, getTournament } from "@/lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockOkResponse(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockErrorResponse(status: number, body: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
}

describe("API client – request construction", () => {
  it("calls the correct URL for getSummary with no filters", async () => {
    mockOkResponse({ results: { total_matches: 100 } });
    await getSummary();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/proxy/summary");
  });

  it("calls the correct URL for getSummary with filters", async () => {
    mockOkResponse({ results: { total_matches: 100 } });
    await getSummary({ tournaments: ["FIFA World Cup"], date_from: "2010" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/api/proxy/summary?");
    expect(url).toContain("tournaments=FIFA+World+Cup");
    expect(url).toContain("date_from=2010");
  });

  it("calls getTeams with top_n=500", async () => {
    mockOkResponse({ ranking: [] });
    await getTeams();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("top_n=500");
  });

  it("calls getTeam with encoded name", async () => {
    mockOkResponse({ team: "Brazil" });
    await getTeam("Brazil");
    expect(mockFetch.mock.calls[0][0]).toContain("/team/Brazil");
  });

  it("URL-encodes special characters in team name", async () => {
    mockOkResponse({ team: "Côte d'Ivoire" });
    await getTeam("Côte d'Ivoire");
    expect(mockFetch.mock.calls[0][0]).toContain("C%C3%B4te%20d'Ivoire");
  });

  it("calls getTournaments", async () => {
    mockOkResponse([{ tournament: "FIFA World Cup" }]);
    const result = await getTournaments();
    expect(mockFetch.mock.calls[0][0]).toContain("/tournaments");
    expect(result).toEqual([{ tournament: "FIFA World Cup" }]);
  });

  it("calls getTournament with filters", async () => {
    mockOkResponse({ tournament: "FIFA World Cup", summary: {} });
    await getTournament("FIFA World Cup", { date_from: "2010", date_to: "2020" });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/tournament/FIFA%20World%20Cup");
    expect(url).toContain("date_from=2010");
    expect(url).toContain("date_to=2020");
  });
});

describe("API client – error handling", () => {
  it("throws on non-ok response", async () => {
    mockErrorResponse(500, "Internal Server Error");
    await expect(getSummary()).rejects.toThrow("API error 500");
  });

  it("throws on 404 with body", async () => {
    mockErrorResponse(404, "Not Found");
    await expect(getTeam("Nonexistent")).rejects.toThrow("API error 404");
  });
});
