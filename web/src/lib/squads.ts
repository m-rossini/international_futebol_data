'use client';

import { useEffect, useState } from 'react';
import type { SquadMatchItem } from '@/lib/types';

const API = '/api/proxy';
const SQUADS_URL = `${API}/squads?limit=500`;

/** Canonical key for "does this match have squad data". */
export function squadMatchKey(date: string, homeTeam: string, awayTeam: string): string {
  return `${date.slice(0, 10)}|${homeTeam}|${awayTeam}`;
}

/** Detail-page URL for a match's squads. */
export function squadDetailUrl(date: string, homeTeam: string, awayTeam: string): string {
  return `/squads/${encodeURIComponent(date.slice(0, 10))}/${encodeURIComponent(homeTeam)}/${encodeURIComponent(awayTeam)}`;
}

let keysPromise: Promise<Set<string>> | null = null;

/** All squad-match keys, fetched once per session and shared by every consumer. */
export function getSquadMatchKeys(): Promise<Set<string>> {
  if (!keysPromise) {
    keysPromise = fetch(SQUADS_URL)
      .then(async (res): Promise<SquadMatchItem[]> => {
        if (!res.ok) return [];
        const data: unknown = await res.json();
        return Array.isArray(data) ? (data as SquadMatchItem[]) : [];
      })
      .then((items) => {
        const keys = new Set<string>();
        for (const m of items) {
          if (m?.match_date && m?.home_team && m?.away_team) {
            keys.add(squadMatchKey(m.match_date, m.home_team, m.away_team));
          }
        }
        return keys;
      })
      .catch(() => new Set<string>());
  }
  return keysPromise;
}

/** Reset the cached promise (tests only — the module otherwise fetches once). */
export function resetSquadCacheForTests(): void {
  keysPromise = null;
}

/** Squad-match keys for rendering (null while loading). */
export function useSquadMatchKeys(): Set<string> | null {
  const [keys, setKeys] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSquadMatchKeys().then((k) => {
      if (!cancelled) setKeys(k);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return keys;
}

/** Team names that have at least one match with squad data (null while loading). */
export function useSquadTeams(): Set<string> | null {
  const keys = useSquadMatchKeys();
  if (keys === null) return null;
  const teams = new Set<string>();
  for (const key of keys) {
    const [, home, away] = key.split('|');
    if (home) teams.add(home);
    if (away) teams.add(away);
  }
  return teams;
}
