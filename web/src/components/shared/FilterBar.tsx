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

  // The date inputs are held in local state rather than reading straight from
  // the URL. An <input type="date"> reports "" from onChange until the value
  // parses as a complete date, so while the user is typing day/month/year the
  // URL has nothing to read. Driving the input from useSearchParams() meant
  // React re-rendered it with "" on those keystrokes, wiping the partially
  // typed segments back to the "dd-mm-yyyy" placeholder.
  //
  // Local state keeps the picker's own editing state intact, and only writes
  // through to the URL once the value is complete. The URL is still the source
  // of truth for external changes (clear filters, navigation), so the inputs
  // follow it when it changes for a reason other than typing -- the documented
  // "adjust state when a prop changes" pattern, done during render rather than
  // in an effect so there is no extra commit.
  const [dateFromInput, setDateFromInput] = useState(dateFrom);
  const [seenDateFromUrl, setSeenDateFromUrl] = useState(dateFrom);
  if (dateFrom !== seenDateFromUrl) {
    setSeenDateFromUrl(dateFrom);
    setDateFromInput(dateFrom);
  }

  const [dateToInput, setDateToInput] = useState(dateTo);
  const [seenDateToUrl, setSeenDateToUrl] = useState(dateTo);
  if (dateTo !== seenDateToUrl) {
    setSeenDateToUrl(dateTo);
    setDateToInput(dateTo);
  }

  const onDateChange = useCallback(
    (key: string, setLocal: (v: string) => void) => (raw: string) => {
      // Ignore incomplete values: there is nothing to store, and removing the
      // param mid-typing is what used to reset the widget to its placeholder.
      if (!raw) return;
      setLocal(raw);
      push(key, raw);
    },
    [push],
  );

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
              type="date"
              value={dateFromInput}
              onChange={(e) => onDateChange('date_from', setDateFromInput)(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0 w-[140px]">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateToInput}
              onChange={(e) => onDateChange('date_to', setDateToInput)(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
          {/* Only shown once a date is actually set. Clearing goes through
              here rather than the input: a date picker reports an empty value
              both for "incomplete while typing" and for "user cleared it", and
              treating the former as a reset is what wiped the field. */}
          {(dateFromInput || dateToInput) && (
            <button
              type="button"
              onClick={() => {
                logUserAction('clear_dates', { page: pathname });
                setDateFromInput('');
                setDateToInput('');
                push('date_from', '');
                push('date_to', '');
              }}
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
