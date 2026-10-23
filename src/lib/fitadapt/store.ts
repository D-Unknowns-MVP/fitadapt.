import { useSyncExternalStore } from "react";
import type { Plan, Profile, SessionLog } from "./types";

/** All user data lives on the device (localStorage), per the FitAdapt deployment design. */
export interface AppState {
  profile: Profile | null;
  level: number;
  plan: Plan | null;
  logs: SessionLog[];
  cantDo: string[];
}

const KEY = "fitadapt:v1";
const EMPTY: AppState = { profile: null, level: 2, plan: null, logs: [], cantDo: [] };

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function read(): AppState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as AppState) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function getState(): AppState {
  return typeof window === "undefined" ? EMPTY : read();
}

export function setState(update: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const current = read();
  const patch = typeof update === "function" ? update(current) : update;
  cache = { ...current, ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function resetState() {
  window.localStorage.removeItem(KEY);
  cache = EMPTY;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Returns null during SSR/hydration, then the stored state. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => null,
  );
}

/** Pending workout session handed from the plan screen to the session screen. */
export const LEVEL_FOR_EXPERIENCE: Record<1 | 2 | 3, number> = { 1: 2, 2: 3, 3: 4 };
