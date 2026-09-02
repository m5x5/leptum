"use client";

// Solid-OIDC login for connecting a Solid Pod as a storage backend.
// Distinct from the storage facade in lib/remoteStorage.ts — Solid pods speak
// Solid-OIDC + LDP.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';

const CLIENT_NAME = 'Leptum';
const REDIRECT_PATH = '/settings';
const IDP_STORAGE_KEY = 'leptum_solid_idp';
const RETURN_TO_KEY = 'leptum_solid_return_to';

let sessionPromise: Promise<SolidSessionInstance> | null = null;

function redirectUri(): string {
  return `${window.location.origin}${REDIRECT_PATH}`;
}

export function getSolidSession(): Promise<SolidSessionInstance> {
  if (typeof window === 'undefined') {
    throw new Error('Solid session is only available in the browser');
  }
  if (!sessionPromise) {
    const p: Promise<SolidSessionInstance> = import('@uvdsl/solid-oidc-client-browser').then(({ Session }) => {
      return new Session(
        { redirect_uris: [redirectUri()], client_name: CLIENT_NAME },
        { workerUrl: '/solid-refresh-worker.js' }
      );
    });
    sessionPromise = p;
    // Don't cache a rejected promise forever — let the next call retry.
    p.catch(() => {
      if (sessionPromise === p) sessionPromise = null;
    });
  }
  return sessionPromise;
}

export async function solidLogin(idp: string): Promise<void> {
  const normalized = idp.trim();
  localStorage.setItem(IDP_STORAGE_KEY, normalized);
  rememberReturnPath();
  const session = await getSolidSession();
  await session.login(normalized, redirectUri());
}

/**
 * The OIDC round trip always lands on REDIRECT_PATH (the only route that
 * consumes the ?code=). Stash where the user actually was so /settings can
 * bounce them back after the session is live. Skips /settings itself and the
 * landing page — nothing to return to there.
 */
function rememberReturnPath(): void {
  try {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (path === REDIRECT_PATH || path === '/') return;
    sessionStorage.setItem(RETURN_TO_KEY, path + window.location.search + window.location.hash);
  } catch {
    // sessionStorage unavailable (private mode, etc.) — user just lands on /settings.
  }
}

/** One-shot read of the post-login return path; cleared on read. */
export function consumeSolidReturnPath(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const value = sessionStorage.getItem(RETURN_TO_KEY);
    if (value) sessionStorage.removeItem(RETURN_TO_KEY);
    return value || null;
  } catch {
    return null;
  }
}

export function getLastSolidIdp(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(IDP_STORAGE_KEY) ?? '';
}

/** Consumes ?code=/?state=/?iss= from the URL if present. No-op otherwise. */
export async function solidHandleRedirect(): Promise<SolidSessionInstance> {
  const session = await getSolidSession();
  if (new URLSearchParams(window.location.search).has('code')) {
    await session.handleRedirectFromLogin();
  }
  return session;
}

/** Restores a previous session via the refresh token grant. Resolves even if there's nothing to restore. */
export async function solidRestore(): Promise<SolidSessionInstance> {
  const session = await getSolidSession();
  try {
    await session.restore();
  } catch {
    // No prior session (or refresh failed) — remain unauthenticated.
  }
  return session;
}

export async function solidLogout(): Promise<void> {
  const session = await getSolidSession();
  await session.logout();
  const { invalidateResolvedContainers } = await import('./solidRdf/activeContainers');
  invalidateResolvedContainers();
  // Drop every cached pod read (tasks, routines, profile, …) so nothing from
  // this account survives into the next session.
  const { getQueryClient } = await import('./query/client');
  getQueryClient().clear();
  const { clearResourceCache } = await import('./solidRdf/resourceCache');
  clearResourceCache();
}

let restorePromise: Promise<SolidSessionInstance> | null = null;

/**
 * Ensures the session has been restored at least once this page load, cached
 * so repeat calls (e.g. from every remoteStorageClient method that checks
 * "is Solid active") don't each pay for a refresh-token round trip. Safe to
 * call from any page — unlike Settings/Landing's own mount effects, this
 * doesn't consume a login redirect (that only ever lands on /settings).
 */
export function ensureSolidSessionRestored(): Promise<SolidSessionInstance> {
  if (!restorePromise) {
    const p: Promise<SolidSessionInstance> = (async () => {
      const session = await getSolidSession();
      if (!session.isActive) {
        try {
          await session.restore();
        } catch {
          // No prior session, or refresh failed — remain unauthenticated.
        }
      }
      return session;
    })();
    restorePromise = p;
    // Don't cache a rejected promise forever — let the next call retry.
    p.catch(() => {
      if (restorePromise === p) restorePromise = null;
    });
  }
  return restorePromise;
}

export async function getSolidSessionIfActive(): Promise<SolidSessionInstance | null> {
  const session = await ensureSolidSessionRestored();
  return session.isActive ? session : null;
}
