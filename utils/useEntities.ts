import { useState, useEffect } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface Entity {
  id: string;
  name: string;
  type?: 'person' | 'project' | 'context' | null; // null for untyped/flexible
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  // Load entities on mount
  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const loadedEntities = await remoteStorageClient.getEntities();
      setEntities(loadedEntities);
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEntity = async (entity: Omit<Entity, 'id' | 'createdAt'>) => {
    const newEntity: Entity = {
      ...entity,
      id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    const updatedEntities = [...entities, newEntity];
    setEntities(updatedEntities);
    await remoteStorageClient.saveEntities(updatedEntities);
    return newEntity;
  };

  const updateEntity = async (id: string, updates: Partial<Entity>) => {
    const updatedEntities = entities.map(entity =>
      entity.id === id ? { ...entity, ...updates, updatedAt: Date.now() } : entity
    );
    setEntities(updatedEntities);
    await remoteStorageClient.saveEntities(updatedEntities);
  };

  const deleteEntity = async (id: string) => {
    const updatedEntities = entities.filter(entity => entity.id !== id);
    setEntities(updatedEntities);
    await remoteStorageClient.saveEntities(updatedEntities);

    // TODO: Also clean up mentions referencing this entity
    // This will be handled via useMentions hook when we integrate it
  };

  return {
    entities,
    loading,
    addEntity,
    updateEntity,
    deleteEntity,
    refreshEntities: loadEntities,
  };
}
