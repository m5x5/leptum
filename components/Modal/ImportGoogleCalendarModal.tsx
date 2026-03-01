"use client";

import { useState, useEffect, useCallback } from 'react';
import Modal from './index';
import {
  getClientId,
  getOrRequestToken,
  getStoredToken,
  revokeToken,
  listCalendars,
  listEvents,
  eventStartMs,
  eventEndMs,
  isAllDay,
  GCalCalendar,
  GCalEvent,
} from '../../lib/googleCalendar';
import { remoteStorageClient, Impact } from '../../lib/remoteStorage';

interface Props {
  isOpen: boolean;
  closeModal: () => void;
  /** Pre-fills the date range (Monday of the week). */
  weekStart?: Date;
  weekEnd?: Date;
  /** Called after impacts are saved so parent can refresh. */
  onImported?: (count: number) => void;
}

type Step = 'auth' | 'pick' | 'events';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ImportGoogleCalendarModal({ isOpen, closeModal, weekStart, weekEnd, onImported }: Props) {
  const hasClientId = !!getClientId();

  const [step, setStep] = useState<Step>(getStoredToken() && hasClientId ? 'pick' : 'auth');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [calendars, setCalendars] = useState<GCalCalendar[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState('');
  const [selectedCalId, setSelectedCalId] = useState('');

  const defaultStart = weekStart ?? (() => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d;
  })();
  const defaultEnd = weekEnd ?? (() => {
    const d = new Date(); d.setHours(23,59,59,999); return d;
  })();

  const [rangeStart, setRangeStart] = useState(() => toInputDate(defaultStart));
  const [rangeEnd,   setRangeEnd]   = useState(() => toInputDate(defaultEnd));

  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Reset to correct initial step when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(getStoredToken() && hasClientId ? 'pick' : 'auth');
    setAuthError('');
    setImportError('');
    setEvents([]);
    setSelected(new Set());
  }, [isOpen, hasClientId]);

  // Sync date inputs when weekStart/weekEnd props change
  useEffect(() => {
    if (weekStart) setRangeStart(toInputDate(weekStart));
    if (weekEnd)   setRangeEnd(toInputDate(new Date(weekEnd.getTime() - 1)));
  }, [weekStart, weekEnd]);

  // Load calendars once authenticated
  useEffect(() => {
    if (step !== 'pick') return;
    setCalLoading(true);
    setCalError('');
    getOrRequestToken()
      .then(token => listCalendars(token))
      .then(list => {
        setCalendars(list);
        const primary = list.find(c => c.primary);
        setSelectedCalId(primary?.id ?? list[0]?.id ?? '');
        setCalLoading(false);
      })
      .catch(err => {
        setCalError(err.message);
        setCalLoading(false);
        // If token expired, go back to auth
        if (err.message.includes('expired') || err.message.includes('sign in')) {
          setStep('auth');
        }
      });
  }, [step]);

  const handleSignIn = async () => {
    if (!hasClientId) {
      setAuthError('No Google Client ID found. Add one in Settings → Integrations first.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      await getOrRequestToken();
      setStep('pick');
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDisconnect = () => {
    revokeToken();
    setStep('auth');
    setCalendars([]);
    setEvents([]);
    setSelected(new Set());
  };

  const handleFetchEvents = useCallback(async () => {
    if (!selectedCalId) return;
    setEventsLoading(true);
    setEventsError('');
    setEvents([]);
    setSelected(new Set());
    try {
      const token = await getOrRequestToken();
      const start = new Date(rangeStart);
      const end   = new Date(rangeEnd); end.setHours(23, 59, 59, 999);
      const list  = await listEvents(token, selectedCalId, start, end);
      setEvents(list);
      // Pre-select all events
      setSelected(new Set(list.map(e => e.id)));
      setStep('events');
    } catch (err) {
      setEventsError((err as Error).message);
    } finally {
      setEventsLoading(false);
    }
  }, [selectedCalId, rangeStart, rangeEnd]);

  const toggleEvent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === events.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(events.map(e => e.id)));
    }
  };

  const handleImport = async () => {
    const toImport = events.filter(e => selected.has(e.id));
    if (toImport.length === 0) return;

    setImporting(true);
    setImportError('');
    try {
      const existing = await remoteStorageClient.getImpacts();

      const newImpacts: Impact[] = toImport.map(ev => {
        const startMs = eventStartMs(ev);
        const endMs   = eventEndMs(ev);
        const allDay = isAllDay(ev);
        const imp: Impact = {
          id: `gcal-${ev.id}`,
          activity: ev.summary?.trim() || '(no title)',
          date: startMs || Date.now(),
        };
        if (allDay) imp.allDay = true;
        if (endMs) imp.endTime = endMs;
        if (ev.description) imp.notes = ev.description;
        if (ev.htmlLink) imp.sourceUrl = ev.htmlLink;
        return imp;
      });

      // Deduplicate: skip if same gcal id already imported
      const existingIds = new Set(existing.map(i => i.id));
      const fresh = newImpacts.filter(i => !existingIds.has(i.id));

      if (fresh.length === 0) {
        setImportError('All selected events were already imported.');
        setImporting(false);
        return;
      }

      await remoteStorageClient.saveImpacts([...existing, ...fresh]);
      onImported?.(fresh.length);
      closeModal();
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal} className="max-w-lg w-full">
      <Modal.Title>Import from Google Calendar</Modal.Title>

      {/* ── Step: Auth ── */}
      {step === 'auth' && (
        <Modal.Body>
          <div className="mt-4 space-y-4">
            {!hasClientId && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
                No Google Client ID configured. Go to{' '}
                <a href="/settings" className="underline font-medium">Settings → Integrations</a>{' '}
                to add one first.
              </div>
            )}
            <p className="text-sm">
              Connect your Google account to import calendar events as timeline activities.
            </p>
            {authError && (
              <p className="text-sm text-destructive">{authError}</p>
            )}
            <button
              onClick={handleSignIn}
              disabled={authLoading || !hasClientId}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
            >
              {authLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              ) : (
                <GoogleIcon />
              )}
              Sign in with Google
            </button>
          </div>
        </Modal.Body>
      )}

      {/* ── Step: Pick calendar + range ── */}
      {step === 'pick' && (
        <Modal.Body>
          <div className="mt-4 space-y-4">
            {calLoading && (
              <p className="text-sm text-muted-foreground">Loading calendars…</p>
            )}
            {calError && (
              <p className="text-sm text-destructive">{calError}</p>
            )}
            {!calLoading && !calError && calendars.length > 0 && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Calendar</label>
                  <select
                    value={selectedCalId}
                    onChange={e => setSelectedCalId(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary}{cal.primary ? ' (primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {eventsError && (
                  <p className="text-sm text-destructive">{eventsError}</p>
                )}
              </>
            )}
          </div>
          <Modal.Footer>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Disconnect
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFetchEvents}
                  disabled={!selectedCalId || eventsLoading || calLoading}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {eventsLoading && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  )}
                  Load events
                </button>
              </div>
            </div>
          </Modal.Footer>
        </Modal.Body>
      )}

      {/* ── Step: Select events ── */}
      {step === 'events' && (
        <Modal.Body>
          <div className="mt-3 space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No events found in this date range.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? 's' : ''} found</span>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selected.size === events.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {events.map(ev => {
                    const startMs = eventStartMs(ev);
                    const endMs   = eventEndMs(ev);
                    const allDay  = isAllDay(ev);
                    return (
                      <label
                        key={ev.id}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(ev.id)}
                          onChange={() => toggleEvent(ev.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{ev.summary ?? '(no title)'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {allDay
                              ? formatDate(startMs)
                              : `${formatDate(startMs)}, ${formatTime(startMs)}–${formatTime(endMs)}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
          </div>

          <Modal.Footer>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={selected.size === 0 || importing}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {importing && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  )}
                  Import {selected.size > 0 ? `${selected.size} event${selected.size !== 1 ? 's' : ''}` : ''}
                </button>
              </div>
            </div>
          </Modal.Footer>
        </Modal.Body>
      )}
    </Modal>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
