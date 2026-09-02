// Experimental features are opt-in. They're hidden from navigation and their
// routes show an "enable in Settings" notice until the user turns them on.
//
// State lives in a zustand store (hydrated from localStorage) for synchronous
// reads (nav, gates) and is mirrored to the user's pod via
// UserSettings.enabledExperiments so it follows the user across devices.
import { useEffect } from 'react';
import { create } from 'zustand';

export const EXPERIMENTS = [
  {
    id: 'wellbeing',
    label: 'Wellbeing',
    path: '/impact',
    description: 'Mood and wellbeing tracking with impact analysis.',
  },
  {
    id: 'dayView',
    label: 'Day View',
    path: '/day',
    description: 'ADHD-friendly daily command center with AI-driven steps.',
  },
  {
    id: 'health',
    label: 'Health',
    path: '/health',
    description: 'Steps, sleep and exercise imported from your health data.',
  },
] as const;

export type ExperimentId = (typeof EXPERIMENTS)[number]['id'];

const STORAGE_KEY = 'enabledExperiments';
export const EXPERIMENTS_CHANGED_EVENT = 'experimentsChanged';

const KNOWN_IDS = new Set<string>(EXPERIMENTS.map((e) => e.id));

export function normalizeExperimentIds(values: unknown): ExperimentId[] {
  if (!Array.isArray(values)) return [];
  const out: ExperimentId[] = [];
  for (const v of values) {
    if (typeof v === 'string' && KNOWN_IDS.has(v) && !out.includes(v as ExperimentId)) {
      out.push(v as ExperimentId);
    }
  }
  return out;
}

function readStorage(): ExperimentId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeExperimentIds(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

interface ExperimentsState {
  enabled: ReadonlySet<ExperimentId>;
  /** False until localStorage has been read on the client (server and first client render agree on "all off"). */
  ready: boolean;
  hydrate: () => void;
  setEnabled: (ids: ExperimentId[]) => void;
}

export const useExperimentsStore = create<ExperimentsState>((set) => ({
  enabled: new Set(),
  ready: false,
  hydrate: () => set({ enabled: new Set(readStorage()), ready: true }),
  setEnabled: (ids) => {
    const next = normalizeExperimentIds(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private mode / quota) — in-memory state still updates.
    }
    set({ enabled: new Set(next), ready: true });
    window.dispatchEvent(new Event(EXPERIMENTS_CHANGED_EVENT));
  },
}));

if (typeof window !== 'undefined') {
  // Another tab changed the setting.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) useExperimentsStore.getState().hydrate();
  });
}

/** Synchronous read. Always empty (all off) on the server. */
export function getEnabledExperiments(): ExperimentId[] {
  const { ready, enabled } = useExperimentsStore.getState();
  return ready ? Array.from(enabled) : readStorage();
}

export function isExperimentEnabled(id: ExperimentId): boolean {
  return getEnabledExperiments().includes(id);
}

/** Writes the local mirror and notifies listeners. Does not touch the pod. */
export function setEnabledExperimentsLocal(ids: ExperimentId[]): void {
  if (typeof window === 'undefined') return;
  useExperimentsStore.getState().setEnabled(ids);
}

export function experimentForPath(pathname: string | null | undefined): (typeof EXPERIMENTS)[number] | null {
  if (!pathname) return null;
  return EXPERIMENTS.find((e) => pathname === e.path || pathname.startsWith(`${e.path}/`)) ?? null;
}

/**
 * Reactive set of enabled experiments. Starts empty on both server and first
 * client render (avoids hydration mismatch), then hydrates after mount.
 */
export function useEnabledExperiments(): { enabled: ReadonlySet<ExperimentId>; ready: boolean } {
  const enabled = useExperimentsStore((s) => s.enabled);
  const ready = useExperimentsStore((s) => s.ready);
  const hydrate = useExperimentsStore((s) => s.hydrate);
  useEffect(() => {
    if (!useExperimentsStore.getState().ready) queueMicrotask(hydrate);
  }, [hydrate]);
  return { enabled, ready };
}
