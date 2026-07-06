'use client';

import { useEffect, useState } from 'react';
import { getAllMappedNames } from '@/lib/countryFlags';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { logApiCall } from '@/lib/observability';

const API = '/api/proxy';

export function FlagReportClient() {
  const [teams, setTeams] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/filters`);
        const duration = performance.now() - t0;
        logApiCall('/filters', duration, res.status, { page: 'flag_report' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTeams(data.teams || []);
          setCountries(data.countries || []);
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/filters', duration, 0, {
          page: 'flag_report',
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapped = getAllMappedNames();

  const teamsWithoutFlag = teams.filter((t) => !mapped.has(t)).sort((a, b) => a.localeCompare(b));

  const countriesWithoutFlag = countries
    .filter((c) => !mapped.has(c))
    .sort((a, b) => a.localeCompare(b));

  const totalTeams = teams.length;
  const totalCountries = countries.length;
  const teamsWithFlag = totalTeams - teamsWithoutFlag.length;
  const countriesWithFlag = totalCountries - countriesWithoutFlag.length;

  if (loading) {
    return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  }

  if (error) {
    return <p className="p-8 text-sm text-red-500">Error loading report: {error}</p>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* MCP Server Instructions */}
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">MCP Server for AI Agents</h2>
        <p className="text-sm text-gray-500 mb-4">
          This project exposes an MCP (Model Context Protocol) server that allows AI agents to query
          international football data. Configure your agent to connect to either the local stdio
          transport or the remote SSE endpoint.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* stdio config */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              stdio (Claude Desktop / local)
            </h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-800 overflow-x-auto">
              {`{
  "mcpServers": {
    "football-stats": {
      "command": "uv",
      "args": [
        "run", "python",
        "football_stats/mcp_server.py"
      ],
      "cwd": "/path/to/international_futebol_data/api"
    }
  }
}`}
            </pre>
          </div>

          {/* SSE config */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">SSE (remote access)</h3>
            <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-800 overflow-x-auto">
              {`{
  "mcpServers": {
    "football-stats": {
      "url": "http://localhost:7532/sse"
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Available tools */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Available Tools</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-3 py-2 font-medium">Tool</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_health</td>
                  <td className="px-3 py-2 text-gray-600">Health check</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_summary</td>
                  <td className="px-3 py-2 text-gray-600">Dataset overview with filters</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_team_stats</td>
                  <td className="px-3 py-2 text-gray-600">Detailed stats for a national team</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_head_to_head</td>
                  <td className="px-3 py-2 text-gray-600">Head-to-head comparison</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_rankings</td>
                  <td className="px-3 py-2 text-gray-600">Top N teams by a statistic</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_top_scorers</td>
                  <td className="px-3 py-2 text-gray-600">Top goal scorers of all time</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_biggest_wins</td>
                  <td className="px-3 py-2 text-gray-600">Largest-margin victories</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_goals_per_year</td>
                  <td className="px-3 py-2 text-gray-600">Goals and averages per year</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">list_tournaments</td>
                  <td className="px-3 py-2 text-gray-600">List all tournaments with stats</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_tournament</td>
                  <td className="px-3 py-2 text-gray-600">Detailed tournament stats</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">list_cities</td>
                  <td className="px-3 py-2 text-gray-600">List host cities with stats</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_city</td>
                  <td className="px-3 py-2 text-gray-600">Detailed city stats</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">list_countries</td>
                  <td className="px-3 py-2 text-gray-600">List host countries with stats</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">get_country</td>
                  <td className="px-3 py-2 text-gray-600">Detailed country stats</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Flag Coverage Report */}
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Flag Coverage Report</h2>
        <p className="text-sm text-gray-500 mb-6">
          Shows which teams and countries from the dataset do not have a flag mapped in the system.
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Teams" total={totalTeams} covered={teamsWithFlag} color="green" />
          <SummaryCard
            label="Countries"
            total={totalCountries}
            covered={countriesWithFlag}
            color="blue"
          />
          <SummaryCard
            label="Teams missing"
            total={totalTeams}
            covered={teamsWithFlag}
            color="red"
            invert
          />
          <SummaryCard
            label="Countries missing"
            total={totalCountries}
            covered={countriesWithFlag}
            color="red"
            invert
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teams missing flags */}
          <section>
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              Teams Without Flags ({teamsWithoutFlag.length})
            </h3>
            {teamsWithoutFlag.length === 0 ? (
              <p className="text-sm text-green-600">All teams have a flag mapping!</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <th className="px-3 py-2 font-medium">Team</th>
                      <th className="px-3 py-2 font-medium">Flag</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamsWithoutFlag.map((t) => (
                      <tr key={t} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{t}</td>
                        <td className="px-3 py-2">
                          <CountryFlag countryName={t} size={16} />
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-xs text-red-500">
                            <MissingBadge />
                            Not mapped
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Countries missing flags */}
          <section>
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              Countries Without Flags ({countriesWithoutFlag.length})
            </h3>
            {countriesWithoutFlag.length === 0 ? (
              <p className="text-sm text-green-600">All countries have a flag mapping!</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <th className="px-3 py-2 font-medium">Country</th>
                      <th className="px-3 py-2 font-medium">Flag</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countriesWithoutFlag.map((c) => (
                      <tr key={c} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{c}</td>
                        <td className="px-3 py-2">
                          <CountryFlag countryName={c} size={16} />
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-xs text-red-500">
                            <MissingBadge />
                            Not mapped
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({
  label,
  total,
  covered,
  color,
  invert = false,
}: {
  label: string;
  total: number;
  covered: number;
  color: 'green' | 'blue' | 'red';
  invert?: boolean;
}) {
  const value = invert ? total - covered : covered;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  const colors: Record<string, string> = {
    green: 'text-green-600 bg-green-50 border-green-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs opacity-60">
        {pct}% of {total}
      </p>
    </div>
  );
}

function MissingBadge() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  );
}
