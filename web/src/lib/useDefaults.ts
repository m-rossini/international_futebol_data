"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "football-defaults";

export interface Defaults {
  defaultTeam: string | null;
  defaultTournament: string | null;
}

function loadDefaults(): Defaults {
  if (typeof window === "undefined") return { defaultTeam: null, defaultTournament: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { defaultTeam: null, defaultTournament: null };
    const parsed = JSON.parse(raw);
    return {
      defaultTeam: typeof parsed.defaultTeam === "string" ? parsed.defaultTeam : null,
      defaultTournament: typeof parsed.defaultTournament === "string" ? parsed.defaultTournament : null,
    };
  } catch {
    return { defaultTeam: null, defaultTournament: null };
  }
}

export function useDefaults() {
  const [defaults, setDefaultsState] = useState<Defaults>(loadDefaults);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDefaultsState(loadDefaults());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setDefaults = useCallback(
    (team: string | null, tournament: string | null) => {
      const val: Defaults = {
        defaultTeam: team || null,
        defaultTournament: tournament || null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      setDefaultsState(val);
    },
    [],
  );

  const clearDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDefaultsState({ defaultTeam: null, defaultTournament: null });
  }, []);

  const hasDefaults = defaults.defaultTeam !== null || defaults.defaultTournament !== null;

  return { ...defaults, setDefaults, clearDefaults, hasDefaults };
}
