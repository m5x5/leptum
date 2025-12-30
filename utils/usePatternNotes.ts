import { useState, useEffect } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface PatternNote {
  activity: string;
  notes: string;
  createdAt: number;
  updatedAt?: number;
}

export function usePatternNotes() {
  const [patternNotes, setPatternNotes] = useState<PatternNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Load pattern notes on mount
  useEffect(() => {
    loadPatternNotes();
  }, []);

  const loadPatternNotes = async () => {
    try {
      const loadedNotes = await remoteStorageClient.getPatternNotes();
      setPatternNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load pattern notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPatternNote = (activity: string): PatternNote | undefined => {
    return patternNotes.find(note => note.activity === activity);
  };

  const savePatternNote = async (activity: string, notes: string) => {
    const existingNote = patternNotes.find(note => note.activity === activity);

    let updatedNotes: PatternNote[];

    if (existingNote) {
      // Update existing note
      updatedNotes = patternNotes.map(note =>
        note.activity === activity
          ? { ...note, notes, updatedAt: Date.now() }
          : note
      );
    } else {
      // Create new note
      const newNote: PatternNote = {
        activity,
        notes,
        createdAt: Date.now(),
      };
      updatedNotes = [...patternNotes, newNote];
    }

    setPatternNotes(updatedNotes);
    await remoteStorageClient.savePatternNotes(updatedNotes);
  };

  const deletePatternNote = async (activity: string) => {
    const updatedNotes = patternNotes.filter(note => note.activity !== activity);
    setPatternNotes(updatedNotes);
    await remoteStorageClient.savePatternNotes(updatedNotes);
  };

  return {
    patternNotes,
    loading,
    getPatternNote,
    savePatternNote,
    deletePatternNote,
    refreshPatternNotes: loadPatternNotes,
  };
}
