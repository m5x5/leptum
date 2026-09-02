import { useQuery } from '@tanstack/react-query';
import { getSolidSessionIfActive } from '../lib/solidAuth';
import { fetchSolidProfile, type SolidProfile } from './solidProfile';

export type UseSolidProfileResult = SolidProfile & {
  webId: string | null;
  /** True until the session has been checked, so callers can avoid a flash of the fallback. */
  loading: boolean;
};

const EMPTY: SolidProfile = { name: null, photo: null, birthDate: null };

export const solidProfileQueryKey = ['solidProfile'] as const;

type ProfileData = SolidProfile & { webId: string | null };

async function loadProfile(): Promise<ProfileData> {
  const session = await getSolidSessionIfActive();
  const webId = session?.webId ?? null;
  if (!webId) return { webId: null, ...EMPTY };
  const profile = await fetchSolidProfile(webId, session);
  return { webId, ...profile };
}

/**
 * Read-only view of the connected pod owner's profile for UI that just needs an
 * avatar or a name (the home header, for example). Settings owns the connect /
 * disconnect flow and the OIDC redirect — this only restores an existing
 * session, so it is safe to call from any page.
 *
 * Backed by the shared query cache: the WebID document is fetched once per
 * hour regardless of how many components ask, and never re-fetched on a route
 * change. Invalidate `solidProfileQueryKey` after login/logout.
 */
export function useSolidProfile(): UseSolidProfileResult {
  const { data, isPending } = useQuery({
    queryKey: solidProfileQueryKey,
    queryFn: loadProfile,
    // A profile document changes rarely; don't spend the 5-minute default poll on it.
    staleTime: 60 * 60_000,
    refetchInterval: false,
  });
  return { webId: null, ...EMPTY, ...data, loading: isPending };
}
