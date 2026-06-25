"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import type { MatchItem, TeamMatchesByYear } from "@/lib/types";

const API = "/api/proxy";

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ["tournaments", "countries", "date_from", "date_to"]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

function resultLabel(m: MatchItem, teamName: string): { label: string; cls: string } {
  const isHome = m.home_team === teamName;
  const gf = isHome ? m.home_score : m.away_score;
  const ga = isHome ? m.away_score : m.home_score;
  if (gf > ga) return { label: "W", cls: "bg-green-100 text-green-700" };
  if (gf < ga) return { label: "L", cls: "bg-red-100 text-red-700" };
  return { label: "D", cls: "bg-amber-100 text-amber-700" };
}

interface Props {
  teamName: string;
  year: number;
}

export function YearMatchesClient({ teamName, year }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<TeamMatchesByYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = `${API}/team/${encodeURIComponent(teamName)}/matches/${year}${qs ? "?" + qs : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TeamMatchesByYear = await res.json();
        if (!cancelled) {
          if (json.error) {
            setError(json.message || "Team not found");
          } else {
            setData(json);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load matches");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [teamName, year, qs]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(sp.toString());
    const q = params.toString();
    router.push(`/teams/${encodeURIComponent(teamName)}${q ? `?${q}` : ""}`);
  }, [router, sp, teamName]);

  // Column defs that close over teamName
  const matchColumns: Column<MatchItem>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortable: true,
        render: (m) => {
          const d = new Date(`${m.date}T00:00:00`);
          return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        },
      },
      { key: "tournament", header: "Tournament", sortable: true },
      { key: "city", header: "City", sortable: true },
      { key: "country", header: "Country", sortable: true },
      {
        key: "home_team",
        header: "Home",
        sortable: true,
        render: (m) => (
          <span className={m.home_team === teamName ? "font-semibold" : ""}>
            {m.home_team}
          </span>
        ),
      },
      {
        key: "score",
        header: "Score",
        render: (m) => (
          <span className="tabular-nums font-mono">
            {m.home_score} – {m.away_score}
          </span>
        ),
      },
      {
        key: "away_team",
        header: "Away",
        sortable: true,
        render: (m) => (
          <span className={m.away_team === teamName ? "font-semibold" : ""}>
            {m.away_team}
          </span>
        ),
      },
      {
        key: "neutral",
        header: "Neutral",
        render: (m) => (m.neutral ? "Yes" : "No"),
      },
    ],
    [teamName],
  );

  // Summary counts
  const summary = useMemo(() => {
    if (!data?.matches_list) return null;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (const m of data.matches_list) {
      const r = resultLabel(m, teamName);
      if (r.label === "W") wins++;
      else if (r.label === "L") losses++;
      else draws++;
    }
    return { wins, losses, draws, total: data.matches_list.length };
  }, [data, teamName]);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to {teamName}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        {teamName} — {year} Matches
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {sp.toString() ? "Results filtered by current selection" : "All matches"}
      </p>

      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : data ? (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Matches" value={summary.total.toLocaleString()} />
              <StatCard label="Wins" value={summary.wins.toLocaleString()} />
              <StatCard label="Losses" value={summary.losses.toLocaleString()} />
              <StatCard label="Draws" value={summary.draws.toLocaleString()} />
            </div>
          )}

          {data.matches_list.length === 0 ? (
            <p className="text-sm text-gray-400">No matches found for this year.</p>
          ) : (
            <DataTable
              columns={matchColumns}
              data={data.matches_list}
              keyField="date"
              defaultSort={{ key: "date", dir: "desc" }}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
    </div>
  );
}
