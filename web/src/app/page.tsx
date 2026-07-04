'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Swords, Trophy, Check, RotateCcw, TrendingUp, Clock } from 'lucide-react';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { useDefaults } from '@/lib/useDefaults';
import { logUserAction, logApiCall } from '@/lib/observability';

const API = '/api/proxy';

export default function HomePage() {
  const { defaultTeam, defaultTournament, setDefaults, clearDefaults, hasDefaults } = useDefaults();

  const [isHydrated, setIsHydrated] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [tournamentNames, setTournamentNames] = useState<string[]>([]);

  // Local editing state — initialised from saved defaults after hydration
  const [enableTeam, setEnableTeam] = useState(false);
  const [enableTournament, setEnableTournament] = useState(false);
  const [localTeam, setLocalTeam] = useState<string[]>([]);
  const [localTournament, setLocalTournament] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // After hydration, read from localStorage to restore defaults
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
    if (defaultTeam) {
      setEnableTeam(true);
      setLocalTeam([defaultTeam]);
    }
    if (defaultTournament) {
      setEnableTournament(true);
      setLocalTournament([defaultTournament]);
    }
  }, [defaultTeam, defaultTournament]);

  // Fetch filter options once
  useEffect(() => {
    const t0 = performance.now();
    fetch(`${API}/filters`)
      .then((r) => {
        const duration = performance.now() - t0;
        logApiCall('/filters', duration, r.status, { page: 'home' });
        return r.json();
      })
      .then((data) => {
        setTeamNames(data.teams || []);
        setTournamentNames(data.tournaments || []);
      })
      .catch((err) => {
        const duration = performance.now() - t0;
        logApiCall('/filters', duration, 0, { page: 'home', error: String(err) });
      });
  }, []);

  const handleSave = useCallback(() => {
    const team = enableTeam ? (localTeam[0] ?? null) : null;
    const tournament = enableTournament ? (localTournament[0] ?? null) : null;
    logUserAction('save_defaults', { default_team: team, default_tournament: tournament });
    setDefaults(team, tournament);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [enableTeam, enableTournament, localTeam, localTournament, setDefaults]);

  const handleClear = useCallback(() => {
    logUserAction('clear_defaults', {});
    clearDefaults();
    setEnableTeam(false);
    setEnableTournament(false);
    setLocalTeam([]);
    setLocalTournament([]);
  }, [clearDefaults]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <span className="text-5xl mb-4 block">⚽</span>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          International Football Statistics
        </h1>
        <p className="mt-3 text-lg text-gray-500 max-w-lg mx-auto">
          Explore teams, tournaments, and head-to-head matchups across the history of international
          football.
        </p>
      </div>

      {/* Setup card */}
      <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-10">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-5">
          <Trophy size={16} className="text-gray-400" />
          Default Preferences
        </h2>

        {isHydrated ? (
          <>
            {/* Default Team */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={enableTeam}
                  onChange={(e) => {
                    setEnableTeam(e.target.checked);
                    if (!e.target.checked) setLocalTeam([]);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Default Team</span>
              </label>
              {enableTeam && (
                <AutocompleteInput
                  options={teamNames}
                  selected={localTeam}
                  onChange={setLocalTeam}
                  multi={false}
                  placeholder="Search team..."
                />
              )}
            </div>

            {/* Default Tournament */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={enableTournament}
                  onChange={(e) => {
                    setEnableTournament(e.target.checked);
                    if (!e.target.checked) setLocalTournament([]);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Default Tournament</span>
              </label>
              {enableTournament && (
                <AutocompleteInput
                  options={tournamentNames}
                  selected={localTournament}
                  onChange={setLocalTournament}
                  multi={false}
                  placeholder="Search tournament..."
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!enableTeam && !enableTournament}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={14} />
                {saved ? 'Saved!' : 'Save Preferences'}
              </button>
              {hasDefaults && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw size={14} />
                  Clear
                </button>
              )}
            </div>

            {hasDefaults && (
              <p className="mt-3 text-xs text-gray-400">
                Active defaults:{' '}
                {defaultTeam ? (
                  <span className="font-medium text-gray-600">{defaultTeam}</span>
                ) : null}
                {defaultTeam && defaultTournament ? ' + ' : null}
                {defaultTournament ? (
                  <span className="font-medium text-gray-600">{defaultTournament}</span>
                ) : null}
                — they will be pre-applied to filters across the app.
              </p>
            )}
          </>
        ) : (
          <div className="h-[200px] animate-pulse rounded-lg bg-gray-50" />
        )}
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        <Link
          href="/teams"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <Users size={24} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">Teams</span>
          <span className="text-xs text-gray-400 text-center">
            Browse all teams and their stats
          </span>
        </Link>
        <Link
          href="/tournaments"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <Trophy size={24} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">Tournaments</span>
          <span className="text-xs text-gray-400 text-center">Browse tournaments and seasons</span>
        </Link>
        <Link
          href="/head-to-head"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <Swords size={24} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">Head to Head</span>
          <span className="text-xs text-gray-400 text-center">Compare two teams head-to-head</span>
        </Link>
        <Link
          href="/elo-ranking"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all"
        >
          <TrendingUp size={24} className="text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">ELO Rankings</span>
          <span className="text-xs text-gray-400 text-center">
            ELO ratings calculated from match results
          </span>
        </Link>
        <Link
          href="/decade-leaders"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all"
        >
          <Clock size={24} className="text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Decade Leaders</span>
          <span className="text-xs text-gray-400 text-center">Which teams dominated each era?</span>
        </Link>
      </div>
    </div>
  );
}
