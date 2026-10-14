'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AutocompleteInput } from './AutocompleteInput';
import { CountryFlag } from './CountryFlag';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { Defaults } from '@/lib/useDefaults';

interface FilterOptions {
  teams: string[];
  tournaments: string[];
  countries: string[];
}

interface Props {
  fields?: { teams?: boolean; tournaments?: boolean; countries?: boolean; dates?: boolean };
  injectDefaults?: boolean;
  children?: React.ReactNode;
}

const ALL_FIELDS: Required<Props['fields']> = {
  teams: true,
  tournaments: true,
  countries: true,
  dates: true,
};

const FETCHED = new Map<string, FilterOptions>();

export function FilterBar({ fields, injectDefaults = true, children }: Props) {
  const cfg = { ...ALL_FIELDS, ...fields };
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [options, setOptions] = useState<FilterOptions>(
    FETCHED.get('filters') || { teams: [], tournaments: [], countries: [] },
  );

  useEffect(() => {
    if (FETCHED.has('filters')) return;
    let cancelled = false;
    const t0 = performance.now();
    fetch('/api/proxy/filters')
      .then((r) => {
        const duration = performance.now() - t0;
        logApiCall('/filters', duration, r.status, { page: 'filter_bar' });
        return r.json();
      })
      .then((data: FilterOptions) => {
        if (!cancelled) {
          FETCHED.set('filters', data);
          setOptions(data);
        }
      })
      .catch((err) => {
        const duration = performance.now() - t0;
        logApiCall('/filters', duration, 0, { page: 'filter_bar', error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const teams = sp.get('teams')?.split(',').filter(Boolean) || [];
  const tournaments = sp.get('tournaments')?.split(',').filter(Boolean) || [];
  const countries = sp.get('countries')?.split(',').filter(Boolean) || [];
  const dateFrom = sp.get('date_from') || '';
  const dateTo = sp.get('date_to') || '';

  const push = useCallback(
    (key: string, value: string) => {
      if (value) {
        logUserAction('filter_change', { filter_key: key, filter_value: value });
      }
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

  // The date inputs are deliberately UNCONTROLLED (defaultValue + key).
  //
  // Controlling the value makes React write it back into the DOM on every
  // change event. For <input type="date"> that discards the browser's own
  // segmented editing state, which is what snapped the field back to its
  // dd-mm-yyyy placeholder mid-typing, and -- with a controlled value derived
  // from the URL -- also locked the field so a date could not be replaced.
  //
  // Leaving them uncontrolled means React never writes to the widget while the
  // user is typing, so the picker keeps its editing state. The URL is still the
  // source of truth: dateKey changes with either date, remounting the inputs
  // with the new defaultValue. That is what makes a filter cleared elsewhere
  // show as empty.
  const dateKey = `${dateFrom}|${dateTo}`;

  // One navigation, not two. `push` closes over the current `sp`, so calling it
  // twice in a row would make the second rebuild its params from the stale
  // value and undo the first -- clearing date_from only, then restoring it
  // while removing date_to.
  const onDateChange = useCallback(
    (key: string) => (raw: string) => {
      // <input type="date"> reports "" until the value parses as a complete
      // date. Writing that through would clear the param mid-typing and, with a
      // controlled input, wipe the field. Ignoring it keeps the widget intact;
      // the picker simply holds whatever the user has typed so far.
      if (!raw) return;
      push(key, raw);
    },
    [push],
  );

  const clearDates = useCallback(() => {
    logUserAction('clear_dates', { page: pathname });
    const params = new URLSearchParams(sp.toString());
    params.delete('date_from');
    params.delete('date_to');
    router.replace(`${pathname}?${params.toString()}`);
  }, [sp, router, pathname]);

  // Inject saved defaults into URL params on first render (when param is empty)
  const injectedRef = useRef(false);
  useEffect(() => {
    if (!injectDefaults) return;
    if (injectedRef.current) return;
    let defaults: Defaults | null = null;
    try {
      const raw = localStorage.getItem('football-defaults');
      if (raw) defaults = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    if (!defaults) return;

    const params = new URLSearchParams(sp.toString());
    let changed = false;

    if (defaults.defaultTeam && !params.has('teams') && cfg.teams) {
      params.set('teams', defaults.defaultTeam);
      changed = true;
    }
    if (defaults.defaultTournament && !params.has('tournaments') && cfg.tournaments) {
      params.set('tournaments', defaults.defaultTournament);
      changed = true;
    }

    if (changed) {
      injectedRef.current = true;
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [cfg.teams, cfg.tournaments, injectDefaults, sp, router, pathname]);

  const visible = Boolean(cfg.teams || cfg.tournaments || cfg.countries || cfg.dates || children);
  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      {cfg.teams && (
        <div className="flex flex-col gap-1 min-w-0 max-w-[300px] flex-1">
          <label
            className="text-xs font-medium text-gray-500"
            title="Type to search. Click to select multiple teams."
          >
            Teams
          </label>
          <AutocompleteInput
            options={options.teams}
            selected={teams}
            onChange={(sel) => push('teams', sel.join(','))}
            placeholder="All teams"
          />
        </div>
      )}
      {cfg.tournaments && (
        <div className="flex flex-col gap-1 min-w-0 max-w-[300px] flex-1">
          <label
            className="text-xs font-medium text-gray-500"
            title="Type to search. Click to select multiple tournaments."
          >
            Tournaments
          </label>
          <AutocompleteInput
            options={options.tournaments}
            selected={tournaments}
            onChange={(sel) => push('tournaments', sel.join(','))}
            placeholder="All tournaments"
          />
        </div>
      )}
      {cfg.countries && (
        <div className="flex flex-col gap-1 min-w-0 max-w-[300px] flex-1">
          <label
            className="text-xs font-medium text-gray-500"
            title="Type to search. Click to select multiple countries."
          >
            Countries
          </label>
          <AutocompleteInput
            options={options.countries}
            selected={countries}
            onChange={(sel) => push('countries', sel.join(','))}
            placeholder="All countries"
            renderItem={(c) => (
              <span className="inline-flex items-center gap-1.5">
                <CountryFlag countryName={c} size={14} />
                {c}
              </span>
            )}
          />
        </div>
      )}
      {cfg.dates && (
        <>
          <div className="flex flex-col gap-1 min-w-0 w-[140px]">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              key={`date-from-${dateKey}`}
              type="date"
              defaultValue={dateFrom}
              onChange={(e) => onDateChange('date_from')(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0 w-[140px]">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              key={`date-to-${dateKey}`}
              type="date"
              defaultValue={dateTo}
              onChange={(e) => onDateChange('date_to')(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
          {/* Only shown once a date is actually set. Clearing goes through
              here rather than the input: a date picker reports an empty value
              both for "incomplete while typing" and for "user cleared it", and
              treating the former as a reset is what wiped the field. */}
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={clearDates}
              className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg bg-white"
            >
              Clear dates
            </button>
          )}
        </>
      )}
      {children}
    </div>
  );
}
