// One pod collection = one TanStack query. defineCollection() bundles the
// pieces every hook needs so each hook is ~30 lines of domain logic:
//
//   const goals = defineCollection<Goal[]>('goals', () => remoteStorageClient.getGoals(), { initial: [] });
//   goals.useQuery()          // in components
//   goals.fetch()             // outside React: cached when fresh, else one round trip
//   goals.set(prev => ...)    // optimistic cache update after a write
//   goals.markSelfWrite()     // so a pod notification / write announcement for our own write is ignored
//   goals.invalidate()        // force a refetch (rollback after a failed write, external change)
//
// `refreshOn` lists window CustomEvents (the legacy `goalUpdated`-style bus)
// that should invalidate the query; they're wired lazily on the client.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getQueryClient, STALE_MS } from './client';

const SELF_WRITE_WINDOW_MS = 5_000;

export interface CollectionDef<T> {
  readonly name: string;
  readonly key: readonly [string];
  useQuery(): UseQueryResult<T>;
  fetch(): Promise<T>;
  /** Current cached value without fetching (initial value if nothing cached yet). */
  get(): T;
  set(updater: (prev: T) => T): void;
  invalidate(): Promise<void>;
  markSelfWrite(): void;
  isRecentSelfWrite(): boolean;
}

export function defineCollection<T>(
  name: string,
  fetcher: () => Promise<T>,
  opts: { initial: T; refreshOn?: string[]; staleTime?: number }
): CollectionDef<T> {
  const key = [name] as const;
  const staleTime = opts.staleTime ?? STALE_MS;
  let lastSelfWrite = 0;
  let listenersWired = false;

  function wireListeners() {
    if (listenersWired || typeof window === 'undefined' || !opts.refreshOn?.length) return;
    listenersWired = true;
    for (const evt of opts.refreshOn) {
      window.addEventListener(evt, () => {
        void getQueryClient().invalidateQueries({ queryKey: key });
      });
    }
  }

  const def: CollectionDef<T> = {
    name,
    key,
    useQuery() {
      wireListeners();
      return useQuery({ queryKey: key, queryFn: fetcher, staleTime });
    },
    fetch() {
      wireListeners();
      return getQueryClient().fetchQuery({ queryKey: key, queryFn: fetcher, staleTime });
    },
    get() {
      return getQueryClient().getQueryData<T>(key) ?? opts.initial;
    },
    set(updater) {
      getQueryClient().setQueryData<T>(key, (prev) => updater(prev ?? opts.initial));
    },
    invalidate() {
      return getQueryClient().invalidateQueries({ queryKey: key });
    },
    markSelfWrite() {
      lastSelfWrite = Date.now();
    },
    isRecentSelfWrite() {
      return Date.now() - lastSelfWrite < SELF_WRITE_WINDOW_MS;
    },
  };
  return def;
}
