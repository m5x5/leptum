/**
 * Google Calendar integration using Google Identity Services (GIS) Token Model.
 * Pure client-side OAuth — no backend or client secret needed.
 *
 * Setup:
 *  1. Create a project at https://console.cloud.google.com
 *  2. Enable the Google Calendar API
 *  3. Create an OAuth 2.0 Client ID (Web application)
 *  4. Add your app's origin to "Authorized JavaScript origins"
 *  5. Paste the Client ID into Settings → Integrations → Google Calendar
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
}

interface TokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface GCalCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end:   { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  colorId?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const STORAGE_KEY = 'leptum_google_client_id';
const TOKEN_KEY   = 'leptum_google_token';
const TOKEN_EXP_KEY = 'leptum_google_token_exp';

// ─── Script loader ────────────────────────────────────────────────────────────

let scriptLoaded = false;
let scriptLoading = false;
let scriptCallbacks: Array<() => void> = [];

function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) { resolve(); return; }

    scriptCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      scriptCallbacks.forEach(cb => cb());
      scriptCallbacks = [];
    };
    script.onerror = () => {
      scriptLoading = false;
      scriptCallbacks = [];
      reject(new Error('Failed to load Google Identity Services script.'));
    };
    document.head.appendChild(script);
  });
}

// ─── Token management ────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp   = sessionStorage.getItem(TOKEN_EXP_KEY);
  if (!token || !exp) return null;
  if (Date.now() > parseInt(exp, 10)) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXP_KEY);
    return null;
  }
  return token;
}

function storeToken(token: string) {
  // Google access tokens last 3600 seconds; store for 55 min to be safe
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + 55 * 60 * 1000));
}

export function revokeToken() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token);
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXP_KEY);
}

// ─── Client ID persistence ────────────────────────────────────────────────────

export function getClientId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setClientId(id: string) {
  localStorage.setItem(STORAGE_KEY, id.trim());
}

export function clearClientId() {
  localStorage.removeItem(STORAGE_KEY);
  revokeToken();
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Request an access token via GIS popup.
 * Resolves with the token string; rejects on error / user cancellation.
 */
export async function requestAccessToken(): Promise<string> {
  const clientId = getClientId();
  if (!clientId) throw new Error('No Google Client ID configured. Go to Settings to add one.');

  await loadGISScript();

  if (!window.google) throw new Error('Google Identity Services failed to load.');

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response: TokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error('No access token received.'));
          return;
        }
        storeToken(response.access_token);
        resolve(response.access_token);
      },
      error_callback: (err) => {
        if (err.type === 'popup_closed') {
          reject(new Error('Sign-in cancelled.'));
        } else {
          reject(new Error(err.message ?? err.type));
        }
      },
    });
    // If we already have a valid token skip the consent screen
    client.requestAccessToken({ prompt: '' });
  });
}

/**
 * Returns a valid token — from cache or by triggering a new OAuth popup.
 */
export async function getOrRequestToken(): Promise<string> {
  const cached = getStoredToken();
  if (cached) return cached;
  return requestAccessToken();
}

// ─── Calendar API ─────────────────────────────────────────────────────────────

async function gCalFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      revokeToken();
      throw new Error('Google session expired. Please sign in again.');
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Google Calendar API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listCalendars(token: string): Promise<GCalCalendar[]> {
  const data = await gCalFetch<{ items?: GCalCalendar[] }>('/users/me/calendarList', token);
  return (data.items ?? []).sort((a, b) => {
    if (a.primary) return -1;
    if (b.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });
}

export async function listEvents(
  token: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await gCalFetch<{ items?: GCalEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    token,
  );
  return (data.items ?? []).filter(e => e.status !== 'cancelled');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parses a "YYYY-MM-DD" date string as local midnight (avoids UTC offset shifting the day). */
function localMidnight(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Returns a unix timestamp (ms) for the start of a GCal event. */
export function eventStartMs(event: GCalEvent): number {
  if (event.start.dateTime) return new Date(event.start.dateTime).getTime();
  if (event.start.date)     return localMidnight(event.start.date);
  return 0;
}

/** Returns a unix timestamp (ms) for the end of a GCal event. */
export function eventEndMs(event: GCalEvent): number {
  if (event.end.dateTime) return new Date(event.end.dateTime).getTime();
  if (event.end.date)     return localMidnight(event.end.date);
  return 0;
}

/** True if the event is an all-day event (no time component). */
export function isAllDay(event: GCalEvent): boolean {
  return !event.start.dateTime;
}
