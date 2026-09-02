import { useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

export interface PatternNote {
  activity: string;
  notes: string;
  createdAt: number;
  updatedAt?: number;
}

export const patternNotesCollection = defineCollection<PatternNote[]>(
  'patternNotes',
  () => remoteStorageClient.getPatternNotes(),
  { initial: [] }
);

const EMPTY: PatternNote[] = [];

export function usePatternNotes() {
  const { data, isPending } = patternNotesCollection.useQuery();
  const patternNotes = data ?? EMPTY;

  const getPatternNote = useCallback(
    (activity: string): PatternNote | undefined => patternNotes.find((note) => note.activity === activity),
    [patternNotes]
  );

  const savePatternNote = useCallback(async (activity: string, notes: string) => {
    const existing = patternNotesCollection.get().find((note) => note.activity === activity);
    const note: PatternNote = existing
      ? { ...existing, notes, updatedAt: Date.now() }
      : { activity, notes, createdAt: Date.now() };
    patternNotesCollection.markSelfWrite();
    patternNotesCollection.set((prev) =>
      existing ? prev.map((n) => (n.activity === activity ? note : n)) : [...prev, note]
    );
    try {
      await remoteStorageClient.savePatternNote(note);
    } catch (error) {
      console.error('Failed to save pattern note:', error);
      void patternNotesCollection.invalidate();
      throw error;
    }
  }, []);

  const deletePatternNote = useCallback(async (activity: string) => {
    patternNotesCollection.markSelfWrite();
    patternNotesCollection.set((prev) => prev.filter((note) => note.activity !== activity));
    try {
      await remoteStorageClient.deletePatternNote(activity);
    } catch (error) {
      console.error('Failed to delete pattern note:', error);
      void patternNotesCollection.invalidate();
      throw error;
    }
  }, []);

  return {
    patternNotes,
    loading: isPending,
    getPatternNote,
    savePatternNote,
    deletePatternNote,
    refreshPatternNotes: patternNotesCollection.invalidate,
  };
}
