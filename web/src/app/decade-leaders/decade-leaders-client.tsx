'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Medal, BarChart3, Calendar, Clock, Loader2 } from 'lucide-react';
import { CountryFlag } from '@/components/shared/CountryFlag';

const API = '/api/proxy';

interface TeamEntry {
  team: string;
  avg_elo: number;
  peak_elo: number;
  match_count: number;
}

interface DecadeData {
  decade: string;
  year_range: string;
  leader: TeamEntry;
  teams: TeamEntry[];
}

interface DecadeLeadersResponse {
  decades: DecadeData[];
  total_decades: number;
}

const DECADE_VALUES = [
  '',
  '1870s',
  '1880s',
  '1890s',
  '1900s',
  '1910s',
  '1920s',
  '1930s',
  '1940s',
  '1950s',
  '1960s',
  '1970s',
  '1980s',
  '1990s',
  '2000s',
  '2010s',
  '2020s',
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const DECADE_COLORS: Record<string, string> = {
  '1870s': '#8B4513',
  '1880s': '#A0522D',
  '1890s': '#CD853F',
  '1900s': '#DAA520',
  '1910s': '#B8860B',
  '1920s': '#4682B4',
  '1930s': '#4169E1',
  '1940s': '#6A5ACD',
  '1950s': '#2E8B57',
  '1960s': '#228B22',
  '1970s': '#008080',
  '1980s': '#008B8B',
  '1990s': '#1E90FF',
  '2000s': '#4169E1',
  '2010s': '#6A5ACD',
  '2020s': '#8A2BE2',
};

export function DecadeLeadersClient() {
  const [data, setData] = useState<DecadeLeadersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(5);
  const [filterDecade, setFilterDecade] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ top_n: String(topN) });
    if (filterDecade) params.set('decade', filterDecade);

    fetch(`${API}/elo-ranking/decade-leaders?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topN, filterDecade]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load decade leaders</p>
          <p className="text-sm text-gray-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.decades.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500">No decade data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={28} className="text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Decade Leaders</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Which teams dominated each decade? Ranked by average ELO rating calculated from historical
          match results.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Top</span>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          >
            {[3, 5, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <select
            value={filterDecade}
            onChange={(e) => setFilterDecade(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          >
            <option value="">All Decades</option>
            {DECADE_VALUES.filter(Boolean).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decades Grid */}
      <div className="space-y-8">
        {data.decades.map((decade) => {
          const maxElo = Math.max(...decade.teams.map((t) => t.avg_elo));
          const color = DECADE_COLORS[decade.decade] || '#6B7280';

          return (
            <div
              key={decade.decade}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Decade Header */}
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ background: `${color}11`, borderBottom: `3px solid ${color}` }}
              >
                <div className="flex items-center gap-3">
                  <Clock size={20} style={{ color }} />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{decade.decade}</h2>
                    <p className="text-xs text-gray-500">{decade.year_range}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Medal size={16} className="text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">{decade.leader.team}</span>
                  <span className="text-xs text-gray-400 ml-1">
                    — avg ELO {decade.leader.avg_elo}
                  </span>
                </div>
              </div>

              {/* Teams Table */}
              <div className="p-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-2 text-left w-10">#</th>
                      <th className="pb-2 text-left">Team</th>
                      <th className="pb-2 text-right">Avg ELO</th>
                      <th className="pb-2 text-right">Peak ELO</th>
                      <th className="pb-2 text-right">Matches</th>
                      <th className="pb-2 w-1/2">ELO Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decade.teams.map((team, idx) => {
                      const barWidth = (team.avg_elo / maxElo) * 100;
                      const isLeader = idx === 0;
                      return (
                        <tr key={team.team} className="border-b border-gray-50 last:border-b-0">
                          <td className="py-3 text-sm">
                            {isLeader ? (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                                style={{
                                  backgroundColor: MEDAL_COLORS[0] + '33',
                                  color: '#B8860B',
                                }}
                              >
                                1
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs pl-1.5">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Link
                              href={`/team-ranking-comparison?team=${encodeURIComponent(team.team)}`}
                              className="text-sm font-medium text-gray-800 hover:text-violet-600 transition-colors flex items-center gap-2"
                            >
                              <CountryFlag countryName={team.team} size={16} />
                              {team.team}
                            </Link>
                          </td>
                          <td
                            className="py-3 text-sm text-right font-mono font-semibold"
                            style={{ color: isLeader ? color : undefined }}
                          >
                            {team.avg_elo}
                          </td>
                          <td className="py-3 text-sm text-right font-mono text-gray-500">
                            {team.peak_elo}
                          </td>
                          <td className="py-3 text-sm text-right text-gray-400">
                            {team.match_count.toLocaleString()}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${barWidth}%`,
                                    background: isLeader
                                      ? `linear-gradient(90deg, ${color}, ${color}88)`
                                      : `linear-gradient(90deg, ${color}66, ${color}33)`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <BarChart3 size={16} className="text-violet-400" />
          <span>
            Based on average ELO ratings across <strong>{data.total_decades}</strong> decades of
            international football. Higher average ELO indicates more consistent performance.
          </span>
        </div>
      </div>
    </div>
  );
}
