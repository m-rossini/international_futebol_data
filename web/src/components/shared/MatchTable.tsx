"use client";

import { useMemo } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { CountryFlag } from "@/components/shared/CountryFlag";
import type { MatchItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Consistent date formatting: "24 Nov 2022" */
function fmtDate(raw: string): string {
  const d = new Date(raw.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Decide who to bold based on mode. */
function homeCls(m: MatchItem, highlightTeam?: string): string {
  if (highlightTeam) {
    // YearMatches / team‑centric mode: bold if it's "our" team
    return m.home_team === highlightTeam ? "font-semibold" : "";
  }
  // H2H mode: bold the winner
  return m.home_score > m.away_score ? "font-semibold" : "";
}

function awayCls(m: MatchItem, highlightTeam?: string): string {
  if (highlightTeam) {
    return m.away_team === highlightTeam ? "font-semibold" : "";
  }
  return m.away_score > m.home_score ? "font-semibold" : "";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  matches: MatchItem[];
  /** If provided, columns will bold this team's name (YearMatches mode). */
  highlightTeam?: string;
  /** Show the "Neutral" column? (default false) */
  showNeutral?: boolean;
  /** Optional heading rendered above the table. */
  heading?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Row extends MatchItem {
  _key: string;
}

export function MatchTable({ matches, highlightTeam, showNeutral = false, heading }: Props) {
  const rows: Row[] = useMemo(
    () =>
      matches.map((m, i) => ({
        ...m,
        _key: `${m.date}-${m.home_team}-${m.away_team}-${i}`,
      })),
    [matches],
  );

  const hTeam = highlightTeam;

  const columns = useMemo<Column<Row>[]>(() => {
    const cols: Column<Row>[] = [
      { key: "date", header: "Date", sortable: true, render: (r) => fmtDate(r.date) },
      { key: "tournament", header: "Tournament", sortable: true },
      { key: "city", header: "City", sortable: true },
      { key: "country", header: "Country", sortable: true, render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <CountryFlag countryName={r.country} size={14} />
          {r.country}
        </span>
      ) },
      {
        key: "home_team",
        header: "Home",
        sortable: true,
        render: (r) => (
          <span className={`inline-flex items-center gap-1.5 ${homeCls(r, hTeam)}`}>
            <CountryFlag countryName={r.home_team} size={14} />
            {r.home_team}
          </span>
        ),
      },
      {
        key: "score",
        header: "Score",
        render: (r) => (
          <span className="font-mono tabular-nums">
            {r.home_score} – {r.away_score}
          </span>
        ),
      },
      {
        key: "away_team",
        header: "Away",
        sortable: true,
        render: (r) => (
          <span className={`inline-flex items-center gap-1.5 ${awayCls(r, hTeam)}`}>
            <CountryFlag countryName={r.away_team} size={14} />
            {r.away_team}
          </span>
        ),
      },
    ];

    if (showNeutral) {
      cols.push({
        key: "neutral",
        header: "Neutral",
        render: (r) => (r.neutral ? "Yes" : "No"),
      });
    }

    return cols;
  }, [showNeutral, hTeam]);

  if (matches.length === 0) return null;

  return (
    <>
      {heading && (
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{heading}</h2>
      )}
      <DataTable
        columns={columns}
        data={rows}
        keyField="_key"
        defaultSort={{ key: "date", dir: "desc" }}
      />
    </>
  );
}
