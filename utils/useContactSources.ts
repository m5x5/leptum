import { useCallback, useEffect, useState } from 'react';
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { getSolidSessionIfActive } from '../lib/solidAuth';
import { remoteStorageClient } from '../lib/remoteStorage';
import { discoverAddressBooks, type AddressBook, type ContactSourceSelection } from '../lib/solidRdf/addressBooks';

/** Fired after the user saves a new selection so open mention inputs reload their suggestions. */
export const CONTACT_SOURCES_UPDATED_EVENT = 'contactSourcesUpdated';

// Discovery walks the type index plus one document per book and group; cache
// it per WebID for the page's lifetime so Settings and every mention input
// share a single pass instead of each crawling the pod.
const discoveryCache = new Map<string, Promise<AddressBook[]>>();

export function getAddressBooks(session: SolidSessionInstance, webId: string, force = false): Promise<AddressBook[]> {
  if (force || !discoveryCache.has(webId)) {
    const p = discoverAddressBooks(session, webId);
    discoveryCache.set(webId, p);
    p.catch(() => discoveryCache.delete(webId));
  }
  return discoveryCache.get(webId)!;
}

export function selectionFromSettings(settings: {
  suggestContactsFromAddressBooks?: string[];
  suggestContactsFromGroups?: string[];
}): ContactSourceSelection {
  return {
    books: settings.suggestContactsFromAddressBooks ?? [],
    groups: settings.suggestContactsFromGroups ?? [],
  };
}

const EMPTY_SELECTION: ContactSourceSelection = { books: [], groups: [] };

/**
 * The address books on the connected pod plus which of them (or which of
 * their groups) the user wants @mention suggestions drawn from.
 */
export function useContactSources() {
  const [books, setBooks] = useState<AddressBook[]>([]);
  const [selection, setSelection] = useState<ContactSourceSelection>(EMPTY_SELECTION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const session = await getSolidSessionIfActive();
      if (!session?.webId) {
        setBooks([]);
        setSelection(EMPTY_SELECTION);
        return;
      }
      const [found, settings] = await Promise.all([
        getAddressBooks(session, session.webId, force),
        remoteStorageClient.getUserSettings(),
      ]);
      setBooks(found);
      setSelection(selectionFromSettings(settings));
    } catch (err) {
      console.error('Failed to load contact sources:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const save = useCallback(async (next: ContactSourceSelection) => {
    setSaving(true);
    setError(null);
    try {
      const settings = await remoteStorageClient.getUserSettings();
      await remoteStorageClient.saveUserSettings({
        ...settings,
        suggestContactsFromAddressBooks: next.books,
        suggestContactsFromGroups: next.groups,
      });
      setSelection(next);
      window.dispatchEvent(new CustomEvent(CONTACT_SOURCES_UPDATED_EVENT));
    } catch (err) {
      console.error('Failed to save contact sources:', err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return load(true);
  }, [load]);

  return { books, selection, loading, saving, error, save, refresh };
}
