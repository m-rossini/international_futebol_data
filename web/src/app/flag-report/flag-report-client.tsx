"use client";

import { useEffect, useState } from "react";
import { getAllMappedNames } from "@/lib/countryFlags";
import { CountryFlag } from "@/components/shared/CountryFlag";

const API = "/api/proxy";

export function FlagReportClient() {
  const [teams, setTeams] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API}/filters`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTeams(data.teams || []);
          setCountries(data.countries || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
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

  const teamsWithoutFlag = teams
    .filter((t) => !mapped.has(t))
    .sort((a, b) => a.localeCompare(b));

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
    return (
      <p className="p-8 text-sm text-red-500">
        Error loading report: {error}
      </p>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Flag Coverage Report</h1>
      <p className="text-sm text-gray-500 mb-6">
        Shows which teams and countries from the dataset do not have a flag
        mapped in the system.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Teams"
          total={totalTeams}
          covered={teamsWithFlag}
          color="green"
        />
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
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Teams Without Flags ({teamsWithoutFlag.length})
          </h2>
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
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Countries Without Flags ({countriesWithoutFlag.length})
          </h2>
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
  color: "green" | "blue" | "red";
  invert?: boolean;
}) {
  const value = invert ? total - covered : covered;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  const colors: Record<string, string> = {
    green: "text-green-600 bg-green-50 border-green-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs opacity-60">{pct}% of {total}</p>
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
