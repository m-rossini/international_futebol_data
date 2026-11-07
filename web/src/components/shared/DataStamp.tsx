'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

interface SummaryResponse {
  results: {
    total_matches: number;
    tournaments_count: number;
    date_range: { from: string | null; to: string | null };
  };
}

interface FilterOptionsResponse {
  teams: string[];
  countries: string[];
  cities: string[];
}

interface Counts {
  matches: number;
  tournaments: number;
  teams: number;
  countries: number;
  cities: number;
  through: string | null;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One-line, data-backed provenance stamp for the About page.
 *
 * Counts and the coverage end date come from the API, so the page cannot claim
 * a dataset size the backend does not have.
 */
export function DataStamp() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, filtersRes] = await Promise.all([
          fetch(`${API}/summary`),
          fetch(`${API}/filters`),
        ]);
        if (!summaryRes.ok || !filtersRes.ok) return;
        const summary: SummaryResponse = await summaryRes.json();
        const filters: FilterOptionsResponse = await filtersRes.json();
        if (!cancelled) {
          setCounts({
            matches: summary.results.total_matches,
            tournaments: summary.results.tournaments_count,
            teams: filters.teams.length,
            countries: filters.countries.length,
            cities: filters.cities.length,
            through: formatDate(summary.results.date_range.to),
          });
        }
      } catch {
        // The stamp is supplementary: on failure the page still renders without it.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!counts) return null;

  return (
    <p className="text-sm text-gray-500 border-l-4 border-blue-200 pl-3">
      {counts.through ? (
        <>
          Data through <strong className="text-gray-700">{counts.through}</strong>
          {' · '}
        </>
      ) : null}
      <strong className="text-gray-700">{counts.matches.toLocaleString()}</strong> matches
      {' · '}
      <strong className="text-gray-700">{counts.tournaments.toLocaleString()}</strong> tournaments
      {' · '}
      <strong className="text-gray-700">{counts.teams.toLocaleString()}</strong> teams
      {' · '}
      <strong className="text-gray-700">{counts.countries.toLocaleString()}</strong> countries
      {' · '}
      <strong className="text-gray-700">{counts.cities.toLocaleString()}</strong> cities
    </p>
  );
}
