import { useState, useEffect } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

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

export function useMentions() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMentions();
  }, []);

  const loadMentions = async () => {
    try {
      const loadedMentions = await remoteStorageClient.getMentions();
      setMentions(loadedMentions);
    } catch (error) {
      console.error('Failed to load mentions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a single mention
  const addMention = async (mention: Omit<Mention, 'id' | 'createdAt'>) => {
    const newMention: Mention = {
      ...mention,
      id: `mention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    const updatedMentions = [...mentions, newMention];
    setMentions(updatedMentions);
    await remoteStorageClient.saveMentions(updatedMentions);
    return newMention;
  };

  // Update mentions for a specific source (replace all mentions from that source)
  const updateMentionsForSource = async (
    sourceType: string,
    sourceId: string,
    fieldName: string,
    entityIds: string[],
    text?: string
  ) => {
    // Remove old mentions for this source + field
    const filteredMentions = mentions.filter(
      m => !(m.sourceType === sourceType && m.sourceId === sourceId && m.fieldName === fieldName)
    );

    // Add new mentions
    const newMentions = entityIds.map((entityId, index) => ({
      id: `mention-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      sourceType,
      sourceId,
      entityId,
      fieldName,
      context: text ? text.substring(0, 100) : undefined, // Store snippet for context
      position: index,
      createdAt: Date.now(),
    }));

    const updatedMentions = [...filteredMentions, ...newMentions];
    setMentions(updatedMentions);
    await remoteStorageClient.saveMentions(updatedMentions);
  };

  // Delete all mentions for a source (when source is deleted)
  const deleteMentionsForSource = async (sourceType: string, sourceId: string) => {
    const updatedMentions = mentions.filter(
      m => !(m.sourceType === sourceType && m.sourceId === sourceId)
    );
    setMentions(updatedMentions);
    await remoteStorageClient.saveMentions(updatedMentions);
  };

  // Delete all mentions for an entity (when entity is deleted)
  const deleteMentionsForEntity = async (entityId: string) => {
    const updatedMentions = mentions.filter(m => m.entityId !== entityId);
    setMentions(updatedMentions);
    await remoteStorageClient.saveMentions(updatedMentions);
  };

  // Query helpers
  const getMentionsForSource = (sourceType: string, sourceId: string) => {
    return mentions.filter(m => m.sourceType === sourceType && m.sourceId === sourceId);
  };

  const getSourcesForEntity = (entityId: string) => {
    return mentions.filter(m => m.entityId === entityId);
  };

  const getMentionsBySourceType = (sourceType: string) => {
    return mentions.filter(m => m.sourceType === sourceType);
  };

  const getMentionCountForEntity = (entityId: string) => {
    return mentions.filter(m => m.entityId === entityId).length;
  };

  return {
    mentions,
    loading,
    addMention,
    updateMentionsForSource,
    deleteMentionsForSource,
    deleteMentionsForEntity,
    getMentionsForSource,
    getSourcesForEntity,
    getMentionsBySourceType,
    getMentionCountForEntity,
    refreshMentions: loadMentions,
  };
}
