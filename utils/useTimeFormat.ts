import { useEffect, useState } from 'react';
import { remoteStorageClient, type TimeFormat } from '../lib/remoteStorage';

const STORAGE_KEY = 'timeFormat';
const EVENT_NAME = 'timeFormatChanged';

export function getStoredTimeFormat(): TimeFormat {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === '12h' || stored === '24h' || stored === 'system') return stored;
  return 'system';
}

export function setStoredTimeFormat(value: TimeFormat): void {
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event(EVENT_NAME));
  void remoteStorageClient.getUserSettings().then((settings) =>
    remoteStorageClient.saveUserSettings({ ...settings, timeFormat: value })
  );
}

/** Resolve to a concrete boolean: should we use 24-hour formatting? */
export function resolveUse24Hour(format: TimeFormat): boolean {
  if (format === '24h') return true;
  if (format === '12h') return false;
  // system: derive from Intl
  if (typeof Intl !== 'undefined') {
    const opts = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    return opts.hour12 === false;
  }
  return false;
}

export function useTimeFormat(): { format: TimeFormat; use24Hour: boolean } {
  const [format, setFormat] = useState<TimeFormat>(() => getStoredTimeFormat());

  useEffect(() => {
    const sync = () => setFormat(getStoredTimeFormat());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    void remoteStorageClient.getUserSettings().then((settings) => {
      if (settings.timeFormat && settings.timeFormat !== getStoredTimeFormat()) {
        localStorage.setItem(STORAGE_KEY, settings.timeFormat);
        setFormat(settings.timeFormat);
      }
    });
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { format, use24Hour: resolveUse24Hour(format) };
}
