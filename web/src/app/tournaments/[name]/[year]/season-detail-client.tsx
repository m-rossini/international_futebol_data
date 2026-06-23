"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, MapPin, Calendar, Target, Users } from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { DataTable } from "@/components/shared/DataTable";
import { getFlagUrl, formatNumber } from "@/lib/utils";
import type { SeasonDetail, SeasonStandingItem, SeasonMatchItem } from "@/lib/types";

const API = "/api/proxy";

export function SeasonDetailClient({
  tournamentName,
  year,
}: {
  tournamentName: string;
  year: number;
}) {
  const [data, setData] = useState<SeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API}/tournament/${encodeURIComponent(tournamentName)}/season/${year}`,
          { signal: controller.signal }
        ).then((r) => r.json());
        setData(res);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLoading(false);
        console.error("Failed to load season:", err);
      }
    }

    load();
    return () => {
      controller.abort();
    };
  }, [tournamentName, year]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-64 mb-2 rounded" />
        <div className="skeleton h-5 w-48 mb-6 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 w-20 mb-2 rounded" />
              <div className="skeleton h-10 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="card p-5 mb-6">
          <div className="skeleton h-[240px] rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div>
        <Link
          href={`/tournaments/${encodeURIComponent(tournamentName)}`}
          className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-4"
        >
          <ArrowLeft size={14} /> Back to {tournamentName}
        </Link>
        <h1 className="page-title mb-2">Season Not Found</h1>
        <p className="text-[14px] text-[#6C757D]">
          No data for {tournamentName} {year}
          {data?.message ? `: ${data.message}` : "."}
        </p>
      </div>
    );
  }

  const s = data.summary;

  const standingsColumns = [
    {
      key: "rank",
      header: "#",
      sortable: false,
      render: (_: SeasonStandingItem, idx: number) => (
        <span className="text-[13px] text-[#6C757D] font-medium">{idx + 1}</span>
      ),
      className: "w-10",
    },
    {
      key: "team",
      header: "Team",
      sortable: true,
      render: (item: SeasonStandingItem) => (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFlagUrl(item.team, 24)}
            alt=""
            className="w-5 h-3.5 object-cover rounded-sm"
          />
          <span className="font-medium">{item.team}</span>
        </div>
      ),
    },
    {
      key: "matches_played",
      header: "MP",
      sortable: true,
      render: (item: SeasonStandingItem) => item.matches_played,
      className: "w-14",
    },
    {
      key: "wins",
      header: "W",
      sortable: true,
      render: (item: SeasonStandingItem) => item.wins,
      className: "w-14",
    },
    {
      key: "draws",
      header: "D",
      sortable: true,
      render: (item: SeasonStandingItem) => item.draws,
      className: "w-14",
    },
    {
      key: "losses",
      header: "L",
      sortable: true,
      render: (item: SeasonStandingItem) => item.losses,
      className: "w-14",
    },
    {
      key: "goals_for",
      header: "GF",
      sortable: true,
      render: (item: SeasonStandingItem) => item.goals_for,
      className: "w-14",
    },
    {
      key: "goals_against",
      header: "GA",
      sortable: true,
      render: (item: SeasonStandingItem) => item.goals_against,
      className: "w-14",
    },
    {
      key: "goal_diff",
      header: "GD",
      sortable: true,
      render: (item: SeasonStandingItem) => (
        <span className={item.goal_diff > 0 ? "text-green-600" : item.goal_diff < 0 ? "text-red-600" : "text-[#6C757D]"}>
          {item.goal_diff > 0 ? "+" : ""}
          {item.goal_diff}
        </span>
      ),
      className: "w-14",
    },
    {
      key: "points",
      header: "Pts",
      sortable: true,
      render: (item: SeasonStandingItem) => (
        <span className="font-bold">{item.points}</span>
      ),
      className: "w-14",
    },
  ];

  const matchesColumns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (m: SeasonMatchItem) => (
        <span className="text-[13px] text-[#6C757D] whitespace-nowrap">
          {m.date ? m.date.slice(0, 10) : ""}
        </span>
      ),
    },
    {
      key: "home_team",
      header: "Home",
      sortable: true,
      render: (m: SeasonMatchItem) => (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFlagUrl(m.home_team, 24)}
            alt=""
            className="w-5 h-3.5 object-cover rounded-sm"
          />
          <span>{m.home_team}</span>
        </div>
      ),
    },
    {
      key: "score",
      header: "",
      sortable: false,
      render: (m: SeasonMatchItem) => (
        <span className="font-bold text-[14px] px-2">
          {m.home_score} – {m.away_score}
        </span>
      ),
      className: "w-20 text-center",
    },
    {
      key: "away_team",
      header: "Away",
      sortable: true,
      render: (m: SeasonMatchItem) => (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFlagUrl(m.away_team, 24)}
            alt=""
            className="w-5 h-3.5 object-cover rounded-sm"
          />
          <span>{m.away_team}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      render: (m: SeasonMatchItem) => (
        <span className="text-[13px] text-[#6C757D]">{m.city || ""}</span>
      ),
    },
  ];

  const biggestWin = s.biggest_win;
  const homePct = s.matches > 0 ? (s.home_wins / s.matches) * 100 : 0;
  const drawPct = s.matches > 0 ? (s.draws / s.matches) * 100 : 0;

  return (
    <div>
      <Link
        href={`/tournaments/${encodeURIComponent(tournamentName)}`}
        className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-1"
      >
        <ArrowLeft size={14} /> Back to {tournamentName}
      </Link>
      <div className="flex items-center gap-3 mb-1">
        <Trophy size={24} className="text-[#FD7E14]" />
        <h1 className="page-title">
          {tournamentName} {year}
        </h1>
      </div>
      <p className="text-[14px] text-[#6C757D] mb-6">
        {data.host_country && (
          <>
            <MapPin size={14} className="inline mr-1" />
            {data.host_country}
            <span className="mx-2">·</span>
          </>
        )}
        <Calendar size={14} className="inline mr-1" />
        {s.matches} matches
        <span className="mx-2">·</span>
        <Target size={14} className="inline mr-1" />
        {s.total_goals} goals
        <span className="mx-2">·</span>
        <Users size={14} className="inline mr-1" />
        {s.unique_teams} teams
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Matches" value={formatNumber(s.matches)} />
        <StatsCard label="Goals" value={formatNumber(s.total_goals)} sub={`${s.avg_goals_per_match.toFixed(2)} avg/match`} />
        <StatsCard label="Teams" value={s.unique_teams} />
        <StatsCard label="Host" value={data.host_country || "—"} />
        <StatsCard label="Home Win Rate" value={`${homePct.toFixed(0)}%`} subColor="success" />
        <StatsCard label="Draw Rate" value={`${drawPct.toFixed(0)}%`} subColor="warning" />
        <StatsCard label="Home Wins" value={s.home_wins} />
        <StatsCard label="Away Wins" value={s.away_wins} />
      </div>

      {/* Biggest Win */}
      {biggestWin && (
        <div className="card p-5 mb-8">
          <h3 className="section-title mb-3">🏆 Biggest Win</h3>
          <p className="text-[14px] text-[#212529]">
            <span className="font-semibold">{biggestWin.home_team}</span>{" "}
            {biggestWin.home_score} – {biggestWin.away_score}{" "}
            <span className="font-semibold">{biggestWin.away_team}</span>
            <span className="text-[13px] text-[#6C757D] ml-2">
              ({biggestWin.date.slice(0, 10)})
            </span>
          </p>
        </div>
      )}

      {/* Standings */}
      <div className="card p-5 mb-8">
        <h3 className="section-title mb-4">📊 Standings</h3>
        <DataTable
          columns={standingsColumns}
          data={data.standings}
          keyField="team"
          defaultSort={{ key: "points", dir: "desc" }}
          onRowClick={(item) => {
            window.location.href = `/teams/${encodeURIComponent(item.team)}`;
          }}
        />
      </div>

      {/* Match Results */}
      <div className="card p-5 mb-8">
        <h3 className="section-title mb-4">⚽ Match Results</h3>
        <DataTable
          columns={matchesColumns}
          data={data.matches_list.map((m, i) => ({ ...m, _idx: i }))}
          keyField="_idx"
          defaultSort={{ key: "date", dir: "asc" }}
        />
      </div>
    </div>
  );
}
