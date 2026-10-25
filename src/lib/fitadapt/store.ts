import { useSyncExternalStore } from "react";
import type { Plan, Profile, SessionLog } from "./types";
import { apiRequest, FITADAPT_API_URL } from "./api";

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
let hydrationStarted = false;
let localRevision = 0;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify() { listeners.forEach((listener) => listener()); }
function persistLocal(state: AppState) { window.localStorage.setItem(KEY, JSON.stringify(state)); }
function syncRemote(state: AppState) {
  if (!FITADAPT_API_URL) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    void apiRequest<{ ok: boolean }>("state", { method: "POST", body: JSON.stringify({ state }) })
      .catch((error) => console.warn("FitAdapt MySQL sync failed. Local data is still saved on this device.", error));
  }, 250);
}

function startHydration() {
  if (hydrationStarted || !FITADAPT_API_URL || typeof window === "undefined") return;
  hydrationStarted = true;
  const revisionAtStart = localRevision;
  const localHasUsefulData = !!(cache?.profile || cache?.plan || cache?.logs.length);
  void apiRequest<{ state: AppState | null }>("state")
    .then(({ state }) => {
      if (!state) {
        // First visit: create the server-side device record from the current local state.
        if (cache) syncRemote(cache);
        return;
      }
      // Local data wins when already present, preventing a refresh from overwriting recent unsynced work.
      if (localRevision === revisionAtStart && !localHasUsefulData && cache && (state.profile || state.plan || state.logs?.length)) {
        cache = { ...EMPTY, ...state };
        persistLocal(cache);
        notify();
      }
    })
    .catch((error) => console.warn("FitAdapt could not restore MySQL state; continuing with local device data.", error));
}

function read(): AppState {
  if (cache) { startHydration(); return cache; }
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<AppState>) } : { ...EMPTY };
  } catch { cache = { ...EMPTY }; }
  startHydration();
  return cache;
}

export function getState(): AppState { return typeof window === "undefined" ? EMPTY : read(); }
export function setState(update: Partial<AppState> | ((state: AppState) => Partial<AppState>)) {
  const current = read();
  const patch = typeof update === "function" ? update(current) : update;
  cache = { ...current, ...patch };
  localRevision++;
  persistLocal(cache);
  syncRemote(cache);
  notify();
}
export function resetState() {
  cache = { ...EMPTY };
  localRevision++;
  window.localStorage.removeItem(KEY);
  syncRemote(cache);
  notify();
}
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
/** Returns null during SSR/hydration, then stored device state. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, () => read(), () => null);
}
export const LEVEL_FOR_EXPERIENCE: Record<1 | 2 | 3, number> = { 1: 2, 2: 3, 3: 4 };
