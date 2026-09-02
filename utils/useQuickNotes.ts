import { useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';
import { v4 as uuidv4 } from 'uuid';

export interface QuickNote {
  id: string;
  text?: string;
  photoIds?: string[];
  audioPath?: string;
  audioDuration?: number;
  createdAt: number;
  updatedAt?: number;
}

export const quickNotesCollection = defineCollection<QuickNote[]>(
  'quickNotes',
  () => remoteStorageClient.getQuickNotes(),
  { initial: [], refreshOn: ['quickNotesUpdated'] }
);

export function useQuickNotes() {
  const { data, isPending } = quickNotesCollection.useQuery();
  const notes = data ?? [];

  const addNote = useCallback(async (note: Partial<QuickNote>): Promise<QuickNote | null> => {
    const newNote: QuickNote = { id: note.id || uuidv4(), createdAt: Date.now(), ...note };
    quickNotesCollection.markSelfWrite();
    quickNotesCollection.set((prev) => [...prev, newNote]);
    try {
      await remoteStorageClient.addQuickNote(newNote);
      return newNote;
    } catch (error) {
      console.error('Failed to add quick note:', error);
      quickNotesCollection.set((prev) => prev.filter((n) => n.id !== newNote.id));
      return null;
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, updates: Partial<QuickNote>) => {
    quickNotesCollection.markSelfWrite();
    quickNotesCollection.set((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, ...updates, updatedAt: Date.now() } : note))
    );
    try {
      await remoteStorageClient.updateQuickNote(noteId, updates);
    } catch (error) {
      console.error('Failed to update quick note:', error);
      void quickNotesCollection.invalidate();
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    quickNotesCollection.markSelfWrite();
    quickNotesCollection.set((prev) => prev.filter((note) => note.id !== noteId));
    try {
      await remoteStorageClient.deleteQuickNote(noteId);
    } catch (error) {
      console.error('Failed to delete quick note:', error);
      void quickNotesCollection.invalidate();
    }
  }, []);

  const saveAudio = useCallback(async (noteId: string, audioBlob: Blob): Promise<string | null> => {
    try {
      const path = await remoteStorageClient.saveQuickNoteAudio(noteId, audioBlob);
      if (path) await updateNote(noteId, { audioPath: path });
      return path;
    } catch (error) {
      console.error('Failed to save audio:', error);
      return null;
    }
  }, [updateNote]);

  const getAudio = useCallback(async (note: QuickNote): Promise<Blob | null> => {
    if (!note.audioPath) return null;
    try {
      return await remoteStorageClient.getQuickNoteAudio(note.audioPath);
    } catch (error) {
      console.error('Failed to get audio:', error);
      return null;
    }
  }, []);

  return {
    notes,
    loading: isPending,
    addNote,
    updateNote,
    deleteNote,
    saveAudio,
    getAudio,
    refreshNotes: quickNotesCollection.invalidate,
  };
}
