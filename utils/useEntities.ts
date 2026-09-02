import { useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

export interface Entity {
  id: string;
  name: string;
  type?: 'person' | 'project' | 'context' | null; // null for untyped/flexible
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

export const entitiesCollection = defineCollection<Entity[]>(
  'entities',
  () => remoteStorageClient.getEntities(),
  { initial: [], refreshOn: ['entitiesUpdated'] }
);

export function useEntities() {
  const { data, isPending } = entitiesCollection.useQuery();
  const entities = data ?? [];

  const addEntity = useCallback(async (entity: Omit<Entity, 'id' | 'createdAt'>) => {
    const newEntity: Entity = {
      ...entity,
      id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    entitiesCollection.markSelfWrite();
    entitiesCollection.set((prev) => [...prev, newEntity]);
    try {
      await remoteStorageClient.saveEntity(newEntity);
    } catch (error) {
      console.error('Failed to add entity:', error);
      void entitiesCollection.invalidate();
      throw error;
    }
    return newEntity;
  }, []);

  const updateEntity = useCallback(async (id: string, updates: Partial<Entity>) => {
    const existing = entitiesCollection.get().find((e) => e.id === id);
    if (!existing) return;
    const updated: Entity = { ...existing, ...updates, updatedAt: Date.now() };
    entitiesCollection.markSelfWrite();
    entitiesCollection.set((prev) => prev.map((e) => (e.id === id ? updated : e)));
    try {
      // A type change moves the resource between containers.
      if (existing.type !== updated.type) await remoteStorageClient.deleteEntity(id, existing.type);
      await remoteStorageClient.saveEntity(updated);
    } catch (error) {
      console.error('Failed to update entity:', error);
      void entitiesCollection.invalidate();
      throw error;
    }
  }, []);

  const deleteEntity = useCallback(async (id: string) => {
    const existing = entitiesCollection.get().find((e) => e.id === id);
    entitiesCollection.markSelfWrite();
    entitiesCollection.set((prev) => prev.filter((e) => e.id !== id));
    try {
      await remoteStorageClient.deleteEntity(id, existing?.type);
    } catch (error) {
      console.error('Failed to delete entity:', error);
      void entitiesCollection.invalidate();
      throw error;
    }
    // TODO: Also clean up mentions referencing this entity (useMentions.deleteMentionsForEntity)
  }, []);

  return {
    entities,
    loading: isPending,
    addEntity,
    updateEntity,
    deleteEntity,
    refreshEntities: entitiesCollection.invalidate,
  };
}
