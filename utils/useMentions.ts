import { useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

export interface Mention {
  id: string;
  sourceType: string; // 'impact', 'insight', 'task', 'habit', 'goal', etc.
  sourceId: string;
  entityId: string;
  context?: string; // Text snippet around the mention
  position?: number; // Character position in source text
  fieldName?: string; // Which field contains the mention
  createdAt: number;
}

export const mentionsCollection = defineCollection<Mention[]>(
  'mentions',
  () => remoteStorageClient.getMentions(),
  { initial: [] }
);

const newId = (suffix = '') => `mention-${Date.now()}-${suffix}${Math.random().toString(36).substr(2, 9)}`;

/** Optimistically apply removals + additions, then persist each as one request; roll back on failure. */
async function applyMentionChanges(remove: Mention[], add: Mention[]) {
  if (remove.length === 0 && add.length === 0) return;
  const removeIds = new Set(remove.map((m) => m.id));
  mentionsCollection.markSelfWrite();
  mentionsCollection.set((prev) => [...prev.filter((m) => !removeIds.has(m.id)), ...add]);
  try {
    await Promise.all([
      ...remove.map((m) => remoteStorageClient.deleteMention(m.id)),
      ...add.map((m) => remoteStorageClient.saveMention(m)),
    ]);
  } catch (error) {
    console.error('Failed to save mentions:', error);
    void mentionsCollection.invalidate();
    throw error;
  }
}

export function useMentions() {
  const { data, isPending } = mentionsCollection.useQuery();
  const mentions = data ?? [];

  // Add a single mention
  const addMention = useCallback(async (mention: Omit<Mention, 'id' | 'createdAt'>) => {
    const newMention: Mention = { ...mention, id: newId(), createdAt: Date.now() };
    await applyMentionChanges([], [newMention]);
    return newMention;
  }, []);

  // Update mentions for a specific source (replace all mentions from that source + field)
  const updateMentionsForSource = useCallback(async (
    sourceType: string,
    sourceId: string,
    fieldName: string,
    entityIds: string[],
    text?: string
  ) => {
    const current = mentionsCollection.get();
    const old = current.filter(
      (m) => m.sourceType === sourceType && m.sourceId === sourceId && m.fieldName === fieldName
    );
    const fresh: Mention[] = entityIds.map((entityId, index) => ({
      id: newId(`${index}-`),
      sourceType,
      sourceId,
      entityId,
      fieldName,
      context: text ? text.substring(0, 100) : undefined,
      position: index,
      createdAt: Date.now(),
    }));
    await applyMentionChanges(old, fresh);
  }, []);

  // Delete all mentions for a source (when source is deleted)
  const deleteMentionsForSource = useCallback(async (sourceType: string, sourceId: string) => {
    const old = mentionsCollection.get().filter((m) => m.sourceType === sourceType && m.sourceId === sourceId);
    await applyMentionChanges(old, []);
  }, []);

  // Delete all mentions for an entity (when entity is deleted)
  const deleteMentionsForEntity = useCallback(async (entityId: string) => {
    const old = mentionsCollection.get().filter((m) => m.entityId === entityId);
    await applyMentionChanges(old, []);
  }, []);

  // Query helpers
  const getMentionsForSource = (sourceType: string, sourceId: string) =>
    mentions.filter((m) => m.sourceType === sourceType && m.sourceId === sourceId);
  const getSourcesForEntity = (entityId: string) => mentions.filter((m) => m.entityId === entityId);
  const getMentionsBySourceType = (sourceType: string) => mentions.filter((m) => m.sourceType === sourceType);
  const getMentionCountForEntity = (entityId: string) => mentions.filter((m) => m.entityId === entityId).length;

  return {
    mentions,
    loading: isPending,
    addMention,
    updateMentionsForSource,
    deleteMentionsForSource,
    deleteMentionsForEntity,
    getMentionsForSource,
    getSourcesForEntity,
    getMentionsBySourceType,
    getMentionCountForEntity,
    refreshMentions: mentionsCollection.invalidate,
  };
}
