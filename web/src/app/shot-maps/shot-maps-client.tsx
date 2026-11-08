'use client';

import { useEffect, useState } from 'react';
import { logApiCall } from '@/lib/observability';
import type { ShotMapsEventsResponse } from '@/lib/types';

const API = '/api/proxy';

export function ShotMapsClient() {
  const [coverage, setCoverage] = useState<ShotMapsEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/shot-maps/events`);
        const duration = performance.now() - t0;
        logApiCall('/shot-maps/events', duration, res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ShotMapsEventsResponse = await res.json();
        if (!cancelled) {
          setCoverage(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Shot Maps data');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Shot Maps</h1>
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Shot Maps</h1>
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      </div>
    );
  }

  const c = coverage!;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Shot Maps</h1>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-500">
          Event data from{' '}
          <a
            href="https://github.com/shot-maps/open-data"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Shot Maps Open Data
          </a>{' '}
          (Shot Maps Public Data User Agreement — non-commercial, attribution).
        </p>
      </div>

      {c.matches_with_events === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">
            No Shot Maps event data available
          </h2>
          <p className="text-sm text-amber-800">
            Place normalized Shot Maps event files (Parquet or JSONL) in{' '}
            <code className="text-amber-800">data/events/</code> to enable shot maps and xG
            features.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-400">Matches with events</p>
              <p className="text-2xl font-bold text-gray-800">
                {c.matches_with_events.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-400">Total events</p>
              <p className="text-2xl font-bold text-gray-800">{c.total_events.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-400">Shots</p>
              <p className="text-2xl font-bold text-gray-800">{c.shots.toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Shot map</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select a match to view its shot map (xG per shot). Shot map data is available for
              matches present in the Shot Maps Open Data files.
            </p>
            <p className="text-xs text-gray-400">
              Note: shot maps are only shown for matches with event data — all other matches display
              the score-only Dixon–Coles model results.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
