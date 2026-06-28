'use client';

import { useEffect, useState, useCallback } from 'react';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { CountryFlag } from '@/components/shared/CountryFlag';

const API = '/api/proxy';

interface Prediction {
  home_team: string;
  away_team: string;
  home_elo: number;
  away_elo: number;
  home_advantage_applied: number;
  neutral_venue: boolean;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  prediction: string;
  confidence: number;
  unknown_teams?: string[];
  note?: string;
  date?: string;
  tournament?: string;
}

function HBar({ v, color }: { v: number; color: string }) {
  return (
    <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex-1 mx-2">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.max(v * 100, 1)}%` }}
      />
    </div>
  );
}

export default function PredictMatchClient() {
  const [teams, setTeams] = useState<string[]>([]);
  const [homeTeam, setHomeTeam] = useState<string[]>([]);
  const [awayTeam, setAwayTeam] = useState<string[]>([]);
  const [neutral, setNeutral] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [upcoming, setUpcoming] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'upcoming'>('single');

  // Fetch team names
  useEffect(() => {
    fetch(`${API}/filters`)
      .then((r) => r.json())
      .then((data) => setTeams(data.teams || []))
      .catch(() => {});
  }, []);

  // Fetch upcoming matches on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUpcomingLoading(true);
    fetch(`${API}/predict/upcoming?limit=5`)
      .then((r) => r.json())
      .then((data) => setUpcoming(data.predictions || []))
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  }, []);

  const handlePredict = useCallback(async () => {
    if (!homeTeam[0] || !awayTeam[0]) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/predict/${encodeURIComponent(homeTeam[0])}/${encodeURIComponent(awayTeam[0])}${neutral ? '?neutral=true' : ''}`,
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data: Prediction = await res.json();
      setPrediction(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [homeTeam, awayTeam, neutral]);

  return (
    <div className="space-y-8">
      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'single', label: 'Predict Match' },
          { key: 'upcoming', label: 'Upcoming' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key as typeof mode)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              mode === tab.key
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Single prediction */}
      {mode === 'single' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Team</label>
              <AutocompleteInput
                options={teams}
                selected={homeTeam}
                onChange={setHomeTeam}
                multi={false}
                placeholder="Search home team..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Away Team</label>
              <AutocompleteInput
                options={teams}
                selected={awayTeam}
                onChange={setAwayTeam}
                multi={false}
                placeholder="Search away team..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={neutral}
                onChange={(e) => setNeutral(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Neutral venue (no home advantage)</span>
            </label>
          </div>

          <button
            onClick={handlePredict}
            disabled={!homeTeam[0] || !awayTeam[0] || loading}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Predicting...' : 'Predict Outcome'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          {prediction && !error && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CountryFlag countryName={prediction.home_team} size={20} />
                  {prediction.home_team}
                  <span className="text-gray-400 font-normal">vs</span>
                  <CountryFlag countryName={prediction.away_team} size={20} />
                  {prediction.away_team}
                </h3>
                <span className="text-xs text-gray-400">
                  ELO: {prediction.home_elo} vs {prediction.away_elo}
                  {prediction.neutral_venue
                    ? ' (neutral)'
                    : ` (+${prediction.home_advantage_applied} home adv.)`}
                </span>
              </div>

              {/* Three-column probs */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm font-semibold text-green-700 mb-1">Home Win</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(prediction.home_win_probability * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-600 mb-1">Draw</div>
                  <div className="text-2xl font-bold text-gray-500">
                    {(prediction.draw_probability * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-red-700 mb-1">Away Win</div>
                  <div className="text-2xl font-bold text-red-600">
                    {(prediction.away_win_probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Connection bars */}
              <div className="flex items-center gap-2 mb-4 px-2">
                <span className="text-xs font-medium text-green-700 w-16 text-right">
                  {(prediction.home_win_probability * 100).toFixed(0)}%
                </span>
                <HBar v={prediction.home_win_probability} color="bg-green-500" />
                <HBar v={prediction.draw_probability} color="bg-gray-400" />
                <HBar v={prediction.away_win_probability} color="bg-red-500" />
                <span className="text-xs font-medium text-red-700 w-16">
                  {(prediction.away_win_probability * 100).toFixed(0)}%
                </span>
              </div>

              {/* Prediction badge */}
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Predicted: {prediction.prediction.toUpperCase()}
                  <span className="text-xs text-blue-400 font-normal">
                    ({(prediction.confidence * 100).toFixed(1)}% confidence)
                  </span>
                </span>
              </div>

              {prediction.note && (
                <div className="mt-3 p-2 bg-yellow-50 text-yellow-700 text-xs rounded-lg">
                  {prediction.note}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upcoming matches */}
      {mode === 'upcoming' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Match Predictions</h3>
          {upcomingLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-50 rounded-lg" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming matches found in the dataset.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((m, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <CountryFlag countryName={m.home_team} size={14} />
                      {m.home_team}
                      <span className="text-gray-400 font-normal">vs</span>
                      <CountryFlag countryName={m.away_team} size={14} />
                      {m.away_team}
                    </div>
                    <div className="text-xs text-gray-400">{m.date}</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{m.tournament}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-16 text-right text-green-700 font-medium">
                      {(m.home_win_probability * 100).toFixed(0)}%
                    </span>
                    <HBar v={m.home_win_probability} color="bg-green-500" />
                    <HBar v={m.draw_probability} color="bg-gray-400" />
                    <HBar v={m.away_win_probability} color="bg-red-500" />
                    <span className="text-xs w-16 text-red-700 font-medium">
                      {(m.away_win_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 text-center">
                    <span className="text-xs font-semibold text-blue-600">
                      Predicted: {m.prediction.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-amber-800 mb-2">How Predictions Work</h4>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>
            • Each team has an ELO rating calculated from all historical matches (1872–present).
          </li>
          <li>
            • The probability formula uses the standard ELO expected score:{' '}
            <code className="bg-amber-100 px-1 rounded">
              1 / (1 + 10^((ELO_away - (ELO_home + home_adv)) / 400))
            </code>
          </li>
          <li>
            • Home advantage adds +100 ELO points by default (toggle &ldquo;neutral venue&rdquo; to
            remove it).
          </li>
          <li>
            • Draw probability is estimated heuristically from the rating gap (higher for equal
            teams).
          </li>
          <li>• Teams not found in historical data get a default rating of 1500.</li>
        </ul>
      </div>
    </div>
  );
}
