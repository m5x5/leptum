// One QueryClient for the whole app. Pod reads are expensive (container
// listing + one GET per member), so the defaults lean towards "reuse what we
// have": data is considered fresh for 30s, refetched in the background every
// 5 minutes and on focus/reconnect, and kept around for 30 minutes after the
// last subscriber unmounts so navigating back is instant.
import { QueryClient } from '@tanstack/react-query';

export const STALE_MS = 30_000;
export const POLL_MS = 5 * 60_000;

let client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: STALE_MS,
          gcTime: 30 * 60_000,
          refetchInterval: POLL_MS,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          retry: 1,
        },
      },
    });
  }
  return client;
}
