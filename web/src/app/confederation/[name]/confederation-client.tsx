'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FilterBar } from '@/components/shared/FilterBar';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { MatchTable } from '@/components/shared/MatchTable';
import { logApiCall } from '@/lib/observability';
import type { ConfederationDetail, MatchItem } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['teams', 'tournaments', 'countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

interface Props {
  name: string;
}

export function ConfederationClient({ name }: Props) {
  const sp = useSearchParams();
  const [detail, setDetail] = useState<ConfederationDetail | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const [dRes, mRes] = await Promise.all([
          fetch(`${API}/confederation/${encodeURIComponent(name)}`),
          fetch(`${API}/confederation/${encodeURIComponent(name)}/matches${qs ? '?' + qs : ''}`),
        ]);
        if (!dRes.ok || !mRes.ok) throw new Error(`HTTP ${dRes.status}/${mRes.status}`);
        const detail: ConfederationDetail = await dRes.json();
        const mData = await mRes.json();
        const matchList: MatchItem[] = mData.matches || [];
        if (!cancelled) {
          // Unknown confederation → API returns {error: true, ...} with HTTP 200
          if ((detail as ConfederationDetail & { error?: boolean }).error) {
            setError(
              (detail as ConfederationDetail & { message?: string }).message ??
                'Unknown confederation',
            );
            setLoading(false);
            return;
          }
          setDetail(detail);
          setMatches(matchList);
          setLoading(false);
        }
      } catch (err) {
        logApiCall(`/confederation/${name}`, performance.now() - t0, 0, {
          query: qs || undefined,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load confederation');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [name, qs]);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>;
  if (!detail) return null;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/confederations"
          className="text-gray-400 hover:text-blue-600"
          onClick={() => {}}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{detail.confederation}</h1>
      </div>

      <FilterBar
        fields={{ teams: true, tournaments: true, countries: true, dates: true }}
        injectDefaults={false}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Total matches</p>
          <p className="text-xl font-semibold text-gray-800">
            {detail.total_matches.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Total goals</p>
          <p className="text-xl font-semibold text-gray-800">
            {detail.total_goals.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Unique teams</p>
          <p className="text-xl font-semibold text-gray-800">
            {detail.unique_teams.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Tournaments</p>
          <p className="text-xl font-semibold text-gray-800">{detail.tournaments.length}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Member countries ({detail.countries.length})
      </h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {detail.countries.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100"
          >
            <CountryFlag countryName={c} size={12} /> {c}
          </span>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-2">Matches</h2>
      <MatchTable matches={matches} />
    </div>
  );
}
