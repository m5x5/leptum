import { useEffect, useState } from 'react';
import { getSolidSessionIfActive } from '../lib/solidAuth';
import { remoteStorageClient } from '../lib/remoteStorage';
import { loadContactsForSelection } from '../lib/solidRdf/addressBooks';
import { CONTACT_SOURCES_UPDATED_EVENT, getAddressBooks, selectionFromSettings } from './useContactSources';
import type { Entity } from './useEntities';

/**
 * Contacts from the pod's Solid address books, narrowed to the books/groups
 * chosen in Settings, shaped as person entities for the @mention input.
 * Reloads when the user changes that selection.
 */
export function useAddressBookContacts() {
  const [contacts, setContacts] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(CONTACT_SOURCES_UPDATED_EVENT, bump);
    return () => window.removeEventListener(CONTACT_SOURCES_UPDATED_EVENT, bump);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getSolidSessionIfActive();
        if (!session?.webId) {
          if (!cancelled) setContacts([]);
          return;
        }
        const [books, settings] = await Promise.all([
          getAddressBooks(session, session.webId),
          remoteStorageClient.getUserSettings(),
        ]);
        const found = await loadContactsForSelection(session, books, selectionFromSettings(settings));
        if (cancelled) return;
        const now = Date.now();
        setContacts(
          found.map((c) => ({
            id: c.url,
            name: c.name,
            type: 'person' as const,
            description: c.email,
            tags: ['address-book'],
            createdAt: now,
          })),
        );
      } catch (error) {
        console.error('Failed to load address book contacts:', error);
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return { contacts, loading };
}
