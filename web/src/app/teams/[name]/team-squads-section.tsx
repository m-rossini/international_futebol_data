'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { logApiCall } from '@/lib/observability';
import { squadDetailUrl } from '@/lib/squads';
import type { MatchItem, SquadMatchItem } from '@/lib/types';

const API = '/api/proxy';

interface Row {
  key: string;
  date: string;
  label: string;
  href: string;
  tournament: string;
}

function fmtDate(raw: string): string {
  const d = new Date(raw.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const columns: Column<Row>[] = [
  { key: 'date', header: 'Date', sortable: true, render: (r) => fmtDate(r.date) },
  {
    key: 'label',
    header: 'Match',
    sortable: true,
    render: (r) => (
      <Link href={r.href} className="text-blue-600 hover:underline">
        {r.label}
      </Link>
    ),
  },
  { key: 'tournament', header: 'Tournament', sortable: true },
];

export function TeamSquadsSection({
  teamName,
  matches,
}: {
  teamName: string;
  matches: MatchItem[];
}) {
  const [items, setItems] = useState<SquadMatchItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API}/squads?teams=${encodeURIComponent(teamName)}&limit=500`);
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const data: SquadMatchItem[] = await res.json();
        logApiCall('/squads', 0, res.status, { team: teamName });
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  const rows = useMemo<Row[]>(() => {
    if (!items) return [];
    const byKey = new Map(
      matches.map((m) => [`${m.date.slice(0, 10)}|${m.home_team}|${m.away_team}`, m]),
    );
    return items.map((s) => {
      const m = byKey.get(`${s.match_date}|${s.home_team}|${s.away_team}`);
      const label =
        m != null
          ? `${s.home_team} ${m.home_score}–${m.away_score} ${s.away_team}`
          : `${s.home_team} vs ${s.away_team}`;
      return {
        key: `${s.match_date}|${s.home_team}|${s.away_team}`,
        date: s.match_date,
        label,
        href: squadDetailUrl(s.match_date, s.home_team, s.away_team),
        tournament: m?.tournament ?? '—',
      };
    });
  }, [items, matches]);

  if (items === null || items.length === 0) return null;

  return (
    <div className="mb-6 scroll-mt-4" id="squads">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Squads ({items.length.toLocaleString()})
      </h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <DataTable
          columns={columns}
          data={rows}
          keyField="key"
          defaultSort={{ key: 'date', dir: 'desc' }}
        />
      </div>
    </div>
  );
}
