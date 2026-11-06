'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ArrowRightLeft, CheckCircle2, Loader2, Minus, Play, Plus } from 'lucide-react';
import { FilterBar } from '@/components/shared/FilterBar';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { StatsBar, buildH2HStats } from '@/components/shared/StatsBar';
import { BiggestWinsCard } from '@/components/shared/BiggestWinsCard';
import { MatchTable } from '@/components/shared/MatchTable';
import { CumulativeWinsChart } from '@/components/shared/chart/CumulativeWinsChart';
import { CumulativeGoalsChart } from '@/components/shared/chart/CumulativeGoalsChart';
import { GoalsHistogramChart } from '@/components/shared/chart/GoalsHistogramChart';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { HeadToHeadResult, BiggestWin, SimulationResult } from '@/lib/types';

const API = '/api/proxy';

const DEFAULT_N_SIMS = 1200;
const LOCAL_STORAGE_KEY = 'football-h2h-sim';

let cachedTeams: string[] | null = null;
async function fetchTeams(): Promise<string[]> {
  const cached = cachedTeams;
  if (cached) return cached;
  const res = await fetch(`${API}/filters`);
  const data = await res.json();
  cachedTeams = data.teams || [];
  return cachedTeams ?? [];
}

function buildQs(params: URLSearchParams, team1: string, team2: string): string {
  const q = new URLSearchParams();
  q.set('team1', team1);
  q.set('team2', team2);
  for (const key of ['tournaments', 'countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

export function HeadToHeadClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Inject defaults (team + tournament) on first mount in a single URL replace
  const defaultsInjectedRef = useRef(false);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const initialTeam1 = sp.get('team1');
  const [team1, setTeam1] = useState(initialTeam1 || '');
  const [team2, setTeam2] = useState(sp.get('team2') || '');

  useEffect(() => {
    if (defaultsInjectedRef.current) return;
    if (initialTeam1) return; // already has team1 — user navigated with params, don't inject

    let defaults: { defaultTeam?: string | null; defaultTournament?: string | null } | null = null;
    try {
      const raw = localStorage.getItem('football-defaults');
      if (raw) defaults = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    if (!defaults?.defaultTeam && !defaults?.defaultTournament) return;

    const params = new URLSearchParams(sp.toString());
    let changed = false;

    if (defaults.defaultTeam && !params.has('team1')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeam1(defaults.defaultTeam);
      params.set('team1', defaults.defaultTeam);
      changed = true;
    }
    if (defaults.defaultTournament && !params.has('tournaments')) {
      params.set('tournaments', defaults.defaultTournament);
      changed = true;
    }

    if (changed) {
      defaultsInjectedRef.current = true;
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [initialTeam1, sp, router, pathname]);

  const [result, setResult] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shootoutOnly, setShootoutOnly] = useState(false);

  // Simulation state
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [nSimulations, setNSimulations] = useState(DEFAULT_N_SIMS);
  // Bumped by the "Run simulation" button; every other trigger (team change)
  // leaves it alone, so the button is the only way to force a re-run.
  const [runNonce, setRunNonce] = useState(0);
  const [simStartedAt, setSimStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [lastRun, setLastRun] = useState<{ ms: number; at: Date; nSims: number } | null>(null);
  // Read at fetch time without making nSimulations an effect dependency —
  // editing the number must not silently fire a new run.
  const nSimsRef = useRef(nSimulations);
  useEffect(() => {
    nSimsRef.current = nSimulations;
  }, [nSimulations]);

  // Load persisted simulation preferences
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw || cancelled) return;
        const prefs = JSON.parse(raw);
        if (prefs.nSimulations) setNSimulations(prefs.nSimulations);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist simulation preferences when they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ nSimulations }));
    } catch {
      /* ignore */
    }
  }, [nSimulations]);

  // Elapsed-time ticker so a long run never looks frozen.
  useEffect(() => {
    if (!simLoading) return;
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, [simLoading]);

  const simElapsedMs = simStartedAt ? Math.max(0, nowMs - simStartedAt) : 0;

  // Load team names once
  useEffect(() => {
    fetchTeams()
      .then(setTeamNames)
      .catch(() => {});
  }, []);

  // Persist team selection to URL
  const updateTeamParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp],
  );

  const handleTeam1 = useCallback(
    (sel: string[]) => {
      const val = sel[0] || '';
      logUserAction('select_h2h_team1', { team: val });
      setTeam1(val);
      updateTeamParam('team1', val);
    },
    [updateTeamParam],
  );

  const handleTeam2 = useCallback(
    (sel: string[]) => {
      const val = sel[0] || '';
      logUserAction('select_h2h_team2', { team: val });
      setTeam2(val);
      updateTeamParam('team2', val);
    },
    [updateTeamParam],
  );

  const swapTeams = useCallback(() => {
    logUserAction('swap_h2h_teams', { team1: team2, team2: team1 });
    const t1 = team2;
    const t2 = team1;
    setTeam1(t1);
    setTeam2(t2);
    const params = new URLSearchParams(sp.toString());
    params.set('team1', t1);
    params.set('team2', t2);
    router.replace(`${pathname}?${params.toString()}`);
  }, [team1, team2, router, pathname, sp]);

  // Fetch head-to-head when both teams selected + filters change
  const qs = useMemo(() => buildQs(sp, team1, team2), [sp, team1, team2]);

  useEffect(() => {
    if (!team1 || !team2) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/head_to_head?${qs}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/head_to_head', duration, res.status, { team1, team2 });
        const data: HeadToHeadResult = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.message || 'An error occurred');
            setResult(null);
          } else {
            setResult(data);
          }
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/head_to_head', duration, 0, {
          team1,
          team2,
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
      setError(null);
    };
  }, [qs, team1, team2]);

  useEffect(() => {
    if (!team1 || !team2) return;

    let cancelled = false;
    async function loadSim() {
      setSimLoading(true);
      setSimError(null);
      setLastRun(null);
      const t0 = performance.now();
      setSimStartedAt(t0);
      setNowMs(t0);
      try {
        const q = new URLSearchParams();
        q.set('team1', team1);
        q.set('team2', team2);
        q.set('n_simulations', String(nSimsRef.current));
        q.set('use_elo', 'false'); // Use Dixon-Coles fit by default
        q.set('half_life_years', '3.0');
        const url = `${API}/simulate?${q.toString()}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/simulate', duration, res.status, { team1, team2 });
        const data: SimulationResult = await res.json();
        if (!cancelled) {
          if (data.error) {
            setSimError(data.error || 'Simulation failed');
            setSimulation(null);
          } else {
            setSimulation(data);
            setLastRun({
              ms: duration,
              at: new Date(),
              nSims: data.n_simulations ?? nSimsRef.current,
            });
          }
          setSimLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/simulate', duration, 0, {
          team1,
          team2,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setSimError(err instanceof Error ? err.message : 'Failed to run simulation');
          setSimLoading(false);
        }
      }
    }

    loadSim();
    return () => {
      cancelled = true;
    };
  }, [team1, team2, runNonce]);

  // Extract dynamic keys from the API response
  const team1Wins = result ? ((result[`${result.team1}_wins`] as number) ?? 0) : 0;
  const team2Wins = result ? ((result[`${result.team2}_wins`] as number) ?? 0) : 0;
  const team1Goals = result ? ((result[`${result.team1}_goals`] as number) ?? 0) : 0;
  const team2Goals = result ? ((result[`${result.team2}_goals`] as number) ?? 0) : 0;
  const team1BiggestWins = result
    ? ((result[`${result.team1}_biggest_wins`] as BiggestWin[]) ?? [])
    : [];
  const team2BiggestWins = result
    ? ((result[`${result.team2}_biggest_wins`] as BiggestWin[]) ?? [])
    : [];
  const avgGoalsPerMatch = result?.total_goals_per_match_stats?.mean ?? undefined;

  const sameTeam = team1 && team2 && team1 === team2;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Head to Head</h1>

      {/* Team selectors */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3 mb-4">
        <div className="flex flex-col gap-1 min-w-0 max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Team 1</label>
          <AutocompleteInput
            options={teamNames}
            selected={team1 ? [team1] : []}
            onChange={handleTeam1}
            multi={false}
            placeholder="Select team..."
            renderItem={(item) => (
              <span className="inline-flex items-center gap-1.5">
                <CountryFlag countryName={item} size={14} />
                {item}
              </span>
            )}
          />
        </div>

        <button
          type="button"
          onClick={swapTeams}
          disabled={!team1 || !team2}
          className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-center md:self-end md:mb-0.5"
          title="Swap teams"
        >
          <ArrowRightLeft size={16} className="text-gray-500" />
        </button>

        <div className="flex flex-col gap-1 min-w-0 max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Team 2</label>
          <AutocompleteInput
            options={teamNames}
            selected={team2 ? [team2] : []}
            onChange={handleTeam2}
            multi={false}
            placeholder="Select team..."
            renderItem={(item) => (
              <span className="inline-flex items-center gap-1.5">
                <CountryFlag countryName={item} size={14} />
                {item}
              </span>
            )}
          />
        </div>
      </div>

      <FilterBar fields={{ teams: false }} injectDefaults={false} />

      {/* Content area */}
      {sameTeam ? (
        <p className="text-sm text-amber-600 mt-4">Select two different teams to compare.</p>
      ) : !team1 || !team2 ? (
        <p className="text-sm text-gray-400 mt-4">
          Select two teams to compare their head-to-head record.
        </p>
      ) : loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      ) : result ? (
        <>
          {/* Summary cards */}
          <div className="mb-6 mt-2">
            <StatsBar
              items={buildH2HStats(
                result.team1,
                team1Wins,
                result.draws,
                team1Goals,
                result.team2,
                team2Wins,
                team2Goals,
                result.matches,
                avgGoalsPerMatch,
              )}
            />
          </div>

          {/* Cumulative charts + biggest wins cards */}
          {result.matches > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cumulative wins */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Cumulative Wins</h3>
                <CumulativeWinsChart
                  matches={result.matches_list}
                  team1={result.team1}
                  team2={result.team2}
                />
              </div>

              {/* Cumulative goals */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Cumulative Goals</h3>
                <CumulativeGoalsChart
                  matches={result.matches_list}
                  track={[
                    { team: result.team1, color: '#3b82f6', label: result.team1 },
                    { team: result.team2, color: '#ef4444', label: result.team2 },
                  ]}
                />
              </div>

              {/* Biggest wins cards */}
              <BiggestWinsCard
                team={result.team1}
                opponent={result.team2}
                wins={shootoutOnly ? team1BiggestWins.filter((w) => w.shootout) : team1BiggestWins}
              />
              <BiggestWinsCard
                team={result.team2}
                opponent={result.team1}
                wins={shootoutOnly ? team2BiggestWins.filter((w) => w.shootout) : team2BiggestWins}
              />
            </div>
          )}

          {/* Match history */}
          {result.matches > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  Match History ({result.matches} matches)
                </h2>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shootoutOnly}
                    onChange={(e) => setShootoutOnly(e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-medium text-gray-500">Shootouts only</span>
                </label>
              </div>
              <MatchTable
                matches={
                  shootoutOnly ? result.matches_list.filter((m) => m.shootout) : result.matches_list
                }
                showNeutral
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-4">
              No matches found between {result.team1} and {result.team2} with the current filters.
            </p>
          )}

          {/* Monte Carlo Simulation */}
          {team1 && team2 && team1 !== team2 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Match Simulation (Dixon–Coles bivariate Poisson)
                </h2>
                <span className="text-xs font-medium text-gray-500 bg-amber-50 px-2 py-1 rounded">
                  Method: Dixon–Coles
                </span>
              </div>

              {/* Simulation controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-xl">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-500">Simulations</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNSimulations(Math.max(100, nSimulations - 100))}
                      disabled={nSimulations <= 100 || simLoading}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={nSimulations}
                      disabled={simLoading}
                      onChange={(e) =>
                        setNSimulations(
                          Math.min(100000, Math.max(100, Number(e.target.value) || DEFAULT_N_SIMS)),
                        )
                      }
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                    />
                    <button
                      onClick={() => setNSimulations(Math.min(100000, nSimulations + 100))}
                      disabled={nSimulations >= 100000 || simLoading}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-500">&nbsp;</label>
                  <button
                    onClick={() => {
                      logUserAction('run_h2h_simulation', {
                        team1,
                        team2,
                        nSimulations,
                      });
                      setRunNonce((n) => n + 1);
                    }}
                    disabled={simLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-600 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {simLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Simulating…
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        {simulation ? 'Run again' : 'Run simulation'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {simLoading && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-2 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
                >
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  <span>
                    Fitting Dixon–Coles on real match data and drawing{' '}
                    <strong>{nSimulations.toLocaleString()}</strong> simulations…{' '}
                    <span className="tabular-nums">{(simElapsedMs / 1000).toFixed(1)}s</span>
                  </span>
                </div>
              )}

              {lastRun && !simLoading && !simError && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-2 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800"
                >
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>
                    Finished in <strong>{(lastRun.ms / 1000).toFixed(1)}s</strong> ·{' '}
                    {lastRun.nSims.toLocaleString()} simulations · {simulation?.n_matches_used ?? 0}{' '}
                    matches used ·{' '}
                    <span className="tabular-nums">{lastRun.at.toLocaleTimeString()}</span>
                  </span>
                </div>
              )}

              {simError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {simError}
                </div>
              )}

              {simulation && !simulation.error && (
                <div
                  className={simLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Probability cards */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {simulation.team1} Win
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {(simulation.team1_win_prob * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="text-xs font-medium text-gray-500 mb-1">Draw</div>
                        <div className="text-2xl font-bold text-gray-800">
                          {(simulation.draw_prob * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {simulation.team2} Win
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {(simulation.team2_win_prob * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Expected goals */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 mb-1">Expected Goals</div>
                      <div className="flex items-baseline gap-2 text-lg font-mono text-gray-800">
                        <span>{simulation.team1_expected_goals.toFixed(2)}</span>
                        <span className="text-xs font-normal text-gray-500 mx-1">–</span>
                        <span>{simulation.team2_expected_goals.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Most likely score: <strong>{simulation.most_likely_score}</strong>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Matches used: {simulation.n_matches_used} · ρ: {simulation.rho.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {/* Score histogram */}
                  <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Score-pair distribution ({simulation.n_simulations.toLocaleString()}{' '}
                      simulations)
                    </h3>
                    <GoalsHistogramChart
                      data={simulation.score_histogram}
                      height={300}
                      unit="probability"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      )}
    </div>
  );
}
