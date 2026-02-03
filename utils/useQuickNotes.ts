import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
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

export function useQuickNotes() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();

    // Listen for changes from RemoteStorage
    const handleChange = (event: any) => {
      if (event.relativePath === 'quick-notes' || event.relativePath.startsWith('quick-note-audio/')) {
        loadNotes();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, []);

  const loadNotes = async () => {
    try {
      const loadedNotes = await remoteStorageClient.getQuickNotes();
      setNotes(loadedNotes);
    } catch (error: any) {
      if (!(error?.status === 404 || error?.toString?.().includes('404') || error?.missing)) {
        console.error('Failed to load quick notes:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const addNote = useCallback(async (note: Partial<QuickNote>): Promise<QuickNote | null> => {
    try {
      const newNote: QuickNote = {
        id: note.id || uuidv4(),
        createdAt: Date.now(),
        ...note,
      };

      await remoteStorageClient.addQuickNote(newNote);
      setNotes(prev => [...prev, newNote]);
      return newNote;
    } catch (error) {
      console.error('Failed to add quick note:', error);
      return null;
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, updates: Partial<QuickNote>) => {
    try {
      await remoteStorageClient.updateQuickNote(noteId, updates);
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, ...updates, updatedAt: Date.now() } : note
      ));
    } catch (error) {
      console.error('Failed to update quick note:', error);
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await remoteStorageClient.deleteQuickNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete quick note:', error);
    }
  }, []);

  const saveAudio = useCallback(async (noteId: string, audioBlob: Blob): Promise<string | null> => {
    try {
      const path = await remoteStorageClient.saveQuickNoteAudio(noteId, audioBlob);
      if (path) {
        // Update note with audio path
        await updateNote(noteId, { audioPath: path });
      }
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
    loading,
    addNote,
    updateNote,
    deleteNote,
    saveAudio,
    getAudio,
    refreshNotes: loadNotes,
  };
}
