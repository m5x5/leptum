import { useState, useRef, useEffect, useMemo } from 'react';
import { CameraIcon, MicrophoneIcon, DocumentTextIcon, XIcon, StopIcon, SortDescendingIcon } from '@heroicons/react/solid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useQuickNotes, QuickNote } from '../../utils/useQuickNotes';
import { usePhotoAttachments, PhotoAttachment } from '../../utils/usePhotoAttachments';
import { Button } from '../ui/button';
import { MentionInput, HighlightedMentions, extractMentionedEntityIds } from '../ui/mention-input';
import { useEntities } from '../../utils/useEntities';
import { useMentions } from '../../utils/useMentions';
import dynamic from 'next/dynamic';
// wavesurfer is ~200KB and only needed when a note actually has audio.
const AudioPlayer = dynamic(() => import('../ui/audio-player').then((m) => m.AudioPlayer), {
  ssr: false,
  loading: () => <div className="h-10 rounded-full bg-muted/40 animate-pulse" aria-hidden />,
});
import Image from 'next/image';
import Modal from '../Modal';
import { Dialog, DialogContent } from '../ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '../ui/drawer';
import StandaloneTaskItem from '../Tasks/StandaloneItem';
import type { StandaloneTask } from '../../utils/useStandaloneTasks';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNow } from '../../hooks/useNow';

// Helper to get date key (YYYY-MM-DD) from timestamp
function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Generate last N days as date keys
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(getDateKey(date.getTime()));
  }
  return days;
}

const EFFORT_RANK: Record<string, number> = { XS: 1, S: 2, M: 3, L: 4, XL: 5 };

// Format date key for display
function formatDayLabel(dateKey: string, isToday: boolean): { day: string; date: string } {
  if (isToday) return { day: 'Today', date: '' };
  const date = new Date(dateKey + 'T12:00:00'); // Use noon to avoid timezone issues
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    day: dayNames[date.getDay()],
    date: String(date.getDate()),
  };
}

/** Payload from Web Share Target (stored in localStorage by /share route). */
export interface PendingSharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: { name: string; type: string; base64: string }[];
}

function base64ToFile(base64: string, mime: string, name: string): File {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([new Blob([arr], { type: mime })], name, { type: mime });
}

interface QuickCaptureProps {
  // Task-related props (optional for backwards compatibility)
  tasks?: StandaloneTask[];
  tasksLoading?: boolean;
  onTaskComplete?: (taskId: string) => void;
  onTaskUncomplete?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<StandaloneTask>) => void;
  onTaskStart?: (taskName: string) => void;
  onTaskEdit?: (task: StandaloneTask) => void;
  onTaskSaveToRoutine?: (routineId: string, taskName: string, updates: { name: string; effort?: 'XS' | 'S' | 'M' | 'L' | 'XL'; numericEstimate?: number }) => Promise<void>;
  onTaskReorder?: (orderedIds: string[]) => void;
  currentActivityName?: string;
  /** When this value changes to a truthy number (e.g. timestamp), opens the text note capture (for Shift+N shortcut). */
  openTextNoteTrigger?: number;
  /** Shared content from Web Share Target; when set, a note is created and this is cleared. */
  pendingShare?: PendingSharePayload | null;
  /** Called after pending share has been processed (note created). */
  onProcessedShare?: () => void;
  /** Rendered as the first row of the Tasks list (e.g. an inline "add task" form) when the selected day is today. */
  addTaskRow?: React.ReactNode;
}

interface SortableTaskItemProps {
  task: StandaloneTask;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<StandaloneTask>) => void;
  onStart?: (name: string) => void;
  onEdit?: (task: StandaloneTask) => void;
  onSaveToRoutine?: (routineId: string, taskName: string, updates: { name: string; effort?: 'XS' | 'S' | 'M' | 'L' | 'XL'; numericEstimate?: number }) => Promise<void>;
  isActive: boolean;
}

function SortableTaskItem({ task, ...props }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <StandaloneTaskItem
        task={task}
        {...props}
      />
    </div>
  );
}

export default function QuickCapture({
  tasks = [],
  tasksLoading: _tasksLoading = false,
  onTaskComplete,
  onTaskUncomplete,
  onTaskDelete,
  onTaskUpdate,
  onTaskStart,
  onTaskEdit,
  onTaskSaveToRoutine,
  onTaskReorder,
  currentActivityName,
  openTextNoteTrigger,
  pendingShare,
  onProcessedShare,
  addTaskRow,
}: QuickCaptureProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );
  const [localOrderedIds, setLocalOrderedIds] = useState<string[] | null>(null);
  const [isDraggingTask, setIsDraggingTask] = useState(false);

  // Reset local ordering when underlying tasks change from storage,
  // but never during an active drag (would break pointer capture).
  // Adjusted during render (React's recommended pattern for state that
  // depends on a changed prop) instead of an effect, avoiding an extra
  // cascading render on every tasks/drag change.
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (tasks !== prevTasks && !isDraggingTask) {
    setPrevTasks(tasks);
    setLocalOrderedIds(null);
  }
  const { notes, addNote, updateNote, deleteNote, saveAudio, getAudio, loading: notesLoading } = useQuickNotes();
  const { addPhoto, getPhotosForImpact, getFullImage, photos: allPhotos } = usePhotoAttachments();

  const [showModal, setShowModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [mode, setMode] = useState<'text' | 'camera' | 'voice' | null>(null);
  const [voiceFullscreen, setVoiceFullscreen] = useState(false);
  const [voiceAnimated, setVoiceAnimated] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoAttachment | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const openCapture = (captureMode: 'text' | 'camera' | 'voice') => {
    if (captureMode === 'voice') {
      setMode('voice');
      setVoiceFullscreen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVoiceAnimated(true)));
      return;
    }
    setMode(captureMode);
    if (window.innerWidth < 768) {
      setShowMobileDrawer(true);
    } else {
      setShowModal(true);
    }

    if (captureMode === 'camera') {
      // Auto-open file picker for gallery selection
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  };

  // When parent triggers open (e.g. Shift+N), open text note capture
  useEffect(() => {
    if (openTextNoteTrigger) {
      // Deferred: openCapture calls several state setters, and
      // eslint-plugin-react-hooks forbids calling a setState-triggering
      // function synchronously within an effect body.
      queueMicrotask(() => openCapture('text'));
    }
  }, [openTextNoteTrigger]);

  // Process shared content from Web Share Target (audio, images, text files → one note)
  useEffect(() => {
    if (!pendingShare || notesLoading) return;
    const hasContent =
      (pendingShare.title || pendingShare.text || pendingShare.url) ||
      (pendingShare.files && pendingShare.files.length > 0);
    if (!hasContent) {
      onProcessedShare?.();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const textParts: string[] = [];
        if (pendingShare.title) textParts.push(pendingShare.title);
        if (pendingShare.text) textParts.push(pendingShare.text);
        if (pendingShare.url) textParts.push(pendingShare.url);

        const imageFiles: File[] = [];
        const audioFiles: File[] = [];
        const textFileContents: string[] = [];

        if (pendingShare.files) {
          const mime = (f: { type?: string; name?: string }) => f.type || 'application/octet-stream';
          for (const f of pendingShare.files) {
            const file = base64ToFile(f.base64, mime(f), f.name || 'file');
            const type = f.type || '';
            if (type.startsWith('image/')) {
              imageFiles.push(file);
            } else if (type.startsWith('audio/')) {
              audioFiles.push(file);
            } else if (type.startsWith('text/') || type === 'application/json' || f.name?.match(/\.(txt|md|json)$/i)) {
              try {
                const text = await file.text();
                if (text.trim()) textFileContents.push(text.trim());
              } catch {
                textParts.push(`[File: ${f.name}]`);
              }
            } else {
              textParts.push(`[File: ${f.name}]`);
            }
          }
        }

        if (textFileContents.length) textParts.push(...textFileContents);
        const noteText = textParts.join('\n\n').trim() || undefined;

        const noteId = `quick-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNote = await addNote({
          id: noteId,
          text: noteText,
        });
        if (!newNote || cancelled) {
          onProcessedShare?.();
          return;
        }

        const photoIds: string[] = [];
        for (const photo of imageFiles) {
          const att = await addPhoto(newNote.id, photo, { storeFullImage: true });
          if (att) photoIds.push(att.id);
        }
        if (photoIds.length > 0) await updateNote(newNote.id, { photoIds });

        const firstAudio = audioFiles[0];
        if (firstAudio && !cancelled) {
          await saveAudio(newNote.id, firstAudio);
        }

        if (!cancelled) onProcessedShare?.();
      } catch (err) {
        console.error('Failed to create note from share:', err);
        onProcessedShare?.();
      }
    })();
    return () => { cancelled = true; };
  }, [pendingShare, notesLoading, addNote, updateNote, addPhoto, saveAudio, onProcessedShare]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Day selector state
  const now = useNow();
  const todayKey = getDateKey(now);
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const availableDays = useMemo(() => getLastNDays(7), []);
  const showAddRow = !!addTaskRow && selectedDay === todayKey;
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // File input for gallery selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [noteText, setNoteText] = useState('');
  const { entities } = useEntities();
  const { updateMentionsForSource } = useMentions();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        if (recorder.state !== 'inactive') {
          // Unmounting mid-recording: drop the onstop handler so it doesn't
          // set state on an unmounted component, then stop the recorder.
          recorder.onstop = null;
          recorder.stop();
        }
        recorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const closeVoiceFullscreen = () => {
    setVoiceAnimated(false);
    setTimeout(() => {
      setVoiceFullscreen(false);
      closeCapture();
    }, 250);
  };

  const closeCapture = () => {
    setMode(null);
    setNoteText('');
    setPendingPhotos([]);
    setPhotoPreviews([]);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    
    // Stop recording if active
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (window.innerWidth < 768) {
      setShowMobileDrawer(false);
    } else {
      setShowModal(false);
    }
  };


  const handlePhotoSelect = (file: File) => {
    // Check if file is already added (by name and size to avoid duplicates)
    setPendingPhotos(prev => {
      const isDuplicate = prev.some(p => p.name === file.name && p.size === file.size);
      if (isDuplicate) return prev;
      return [...prev, file];
    });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreviews(prev => {
        const previewUrl = e.target?.result as string;
        // Check if preview already exists
        if (prev.includes(previewUrl)) return prev;
        return [...prev, previewUrl];
      });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = noteText.trim();
    if (!text && pendingPhotos.length === 0 && !audioBlob) {
      return;
    }

    try {
      // Create note first to get the ID
      const noteId = `quick-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate audio duration if present
      let audioDuration: number | undefined;
      if (audioBlob && audioUrl) {
        const audio = new Audio(audioUrl);
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            audioDuration = Math.floor(audio.duration);
            resolve(null);
          };
          audio.onerror = resolve; // Resolve even on error
        });
      }

      // Create note with ID
      const noteData: Partial<QuickNote> = {
        id: noteId,
        text: text || undefined,
        audioDuration,
      };

      const newNote = await addNote(noteData);
      if (!newNote) {
        throw new Error('Failed to create note');
      }

      // Record @mentions like the other note fields do, so they show up on the entity.
      const mentionedEntityIds = extractMentionedEntityIds(text);
      if (mentionedEntityIds.length > 0) {
        await updateMentionsForSource('note', newNote.id, 'text', mentionedEntityIds, text);
      }

      // Save photos using note ID as impact ID
      const photoIds: string[] = [];
      for (const photo of pendingPhotos) {
        const photoAttachment = await addPhoto(newNote.id, photo, { storeFullImage: true });
        if (photoAttachment) {
          photoIds.push(photoAttachment.id);
        }
      }

      // Update note with photo IDs if any
      if (photoIds.length > 0) {
        await updateNote(newNote.id, { photoIds });
      }

      // Save audio if present
      if (audioBlob) {
        await saveAudio(newNote.id, audioBlob);
      }

      // Note: addPhoto already updates local state, so photos should be available immediately
      // We don't need to refresh here as it might overwrite the state before storage syncs

      closeCapture();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Delete this note?')) {
      await deleteNote(noteId);
    }
  };

  // Filter notes by selected day and sort by time (newest first)
  const filteredNotes = useMemo(() => {
    return [...notes]
      .filter((note) => getDateKey(note.createdAt) === selectedDay)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, selectedDay]);

  const [audioUrlsByNoteId, setAudioUrlsByNoteId] = useState<Record<string, string>>({});
  const audioUrlsByNoteIdRef = useRef(audioUrlsByNoteId);
  useEffect(() => {
    audioUrlsByNoteIdRef.current = audioUrlsByNoteId;
  });

  useEffect(() => {
    const notesWithAudio = filteredNotes.filter((n) => n.audioPath);
    const noteIds = new Set(notesWithAudio.map((n) => n.id));
    // Deferred a microtask: this prune reacts to filteredNotes (a derived
    // external value) and belongs in an effect, but eslint-plugin-react-hooks
    // forbids calling a state setter directly/synchronously in an effect body.
    // Deferring by a microtask (fires before the next paint) keeps the
    // revoke-then-prune behavior intact without a synchronous setState call.
    queueMicrotask(() => {
      setAudioUrlsByNoteId((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (!noteIds.has(id)) {
            URL.revokeObjectURL(next[id]);
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    notesWithAudio.forEach((note) => {
      if (audioUrlsByNoteId[note.id]) return;
      getAudio(note)
        .then((blob) => {
          if (blob) {
            setAudioUrlsByNoteId((prev) => {
              if (prev[note.id]) return prev;
              return { ...prev, [note.id]: URL.createObjectURL(blob) };
            });
          }
        })
        .catch((err) => console.error('Error loading note audio:', err));
    });
  }, [filteredNotes, audioUrlsByNoteId, getAudio]);

  useEffect(() => () => {
    Object.values(audioUrlsByNoteIdRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const [sortMode, setSortMode] = useState<'recency' | 'priority'>('recency');

  // Filter tasks by selected day (active tasks only). Active task on top, then by sortIndex, then newest first.
  const filteredTasks = useMemo(() => {
    const base = [...tasks].filter(
      (task) => task.status !== 'completed' && getDateKey(task.createdAt) === selectedDay,
    );

    if (sortMode === 'priority') {
      return base.sort((a, b) => {
        const aActive = currentActivityName ? a.name === currentActivityName : false;
        const bActive = currentActivityName ? b.name === currentActivityName : false;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        // Sort by numericEstimate desc, then by effort rank desc, then newest first
        const aNum = a.numericEstimate ?? 0;
        const bNum = b.numericEstimate ?? 0;
        if (bNum !== aNum) return bNum - aNum;
        const aEffort = a.effort ? EFFORT_RANK[a.effort] : 0;
        const bEffort = b.effort ? EFFORT_RANK[b.effort] : 0;
        if (bEffort !== aEffort) return bEffort - aEffort;
        return b.createdAt - a.createdAt;
      });
    }

    if (localOrderedIds) {
      const idOrder = new Map(localOrderedIds.map((id, i) => [id, i]));
      return base.sort((a, b) => {
        const aIdx = idOrder.has(a.id) ? idOrder.get(a.id)! : Infinity;
        const bIdx = idOrder.has(b.id) ? idOrder.get(b.id)! : Infinity;
        return aIdx - bIdx;
      });
    }

    return base.sort((a, b) => {
      const aActive = currentActivityName ? a.name === currentActivityName : false;
      const bActive = currentActivityName ? b.name === currentActivityName : false;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (a.sortIndex !== undefined && b.sortIndex !== undefined) return a.sortIndex - b.sortIndex;
      if (a.sortIndex !== undefined) return -1;
      if (b.sortIndex !== undefined) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [tasks, selectedDay, currentActivityName, localOrderedIds, sortMode]);

  const captureContent = (
    <form onSubmit={handleSave} className="space-y-4">
      {mode === 'text' && (
        <div>
          <MentionInput
            id="quick-note-input"
            value={noteText}
            onChange={setNoteText}
            entities={entities}
            placeholder="Type your note here... (use @ to mention)"
            multiline
            rows={10}
            autoFocus
          />
        </div>
      )}

      {mode === 'camera' && (
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => handlePhotoSelect(file));
                // Reset input value to allow selecting the same file again
                if (e.target) {
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <CameraIcon className="w-5 h-5 mr-2" />
              Choose from Gallery
            </Button>
          </div>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {photoPreviews.map((preview, index) => (
                <div key={`preview-${index}-${preview.substring(0, 20)}`} className="relative min-w-0">
                  <Image src={preview} alt={`Preview ${index}`} width={200} height={96} unoptimized className="w-full h-24 object-cover rounded" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 min-h-[44px] min-w-[44px] flex items-center justify-center bg-red-500 text-white rounded-full p-1"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'voice' && (
        <div className="space-y-4">
          {!audioBlob ? (
            <div className="text-center py-8">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="w-full"
                >
                  <MicrophoneIcon className="w-6 h-6" />
                  Start Recording
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-4xl font-semibold text-primary">
                    {formatTime(recordingTime)}
                  </div>
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                    className="w-full"
                  >
                    <StopIcon className="w-6 h-6" />
                    Stop Recording
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {audioUrl && (
                <AudioPlayer src={audioUrl} title="Preview" />
              )}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                    setRecordingTime(0);
                  }}
                  variant="outline"
                >
                  Record Again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {(mode === 'text' || pendingPhotos.length > 0 || audioBlob) && (
        <div className="flex gap-2 pt-2">
          <Button type="button" onClick={closeCapture} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Save
          </Button>
        </div>
      )}
    </form>
  );

  return (
    <>
      {/* Day Selector */}
      <div className="mb-4 -mx-1 px-1 py-1">
        <div className="flex min-h-[60px] items-center gap-1 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
          {availableDays.map((dateKey) => {
            const isSelected = dateKey === selectedDay;
            const isToday = dateKey === todayKey;
            const label = formatDayLabel(dateKey, isToday);

            return (
              <button
                type="button"
                key={dateKey}
                onClick={() => setSelectedDay(dateKey)}
                className={`shrink-0 flex flex-col items-center justify-center rounded-control transition-colors h-[52px] w-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-xs font-medium">{label.day}</span>
                {label.date && <span className="text-sm font-semibold">{label.date}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks for Selected Day */}
      {(filteredTasks.length > 0 || showAddRow) && onTaskComplete && onTaskUncomplete && onTaskDelete && onTaskUpdate && (
        <div className="bg-card border border-border rounded-control mb-4">
          <div className="bg-muted/80 px-4 py-2 border-b border-border rounded-t-lg flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Tasks</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 text-xs ${sortMode !== 'recency' ? 'text-primary' : 'text-muted-foreground'}`}
                  title="Sort tasks"
                >
                  <SortDescendingIcon />
                  {sortMode === 'priority' ? 'Priority' : 'Recency'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setSortMode('recency')}
                  className={`cursor-pointer ${sortMode === 'recency' ? 'font-medium' : ''}`}
                >
                  Recency
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortMode('priority')}
                  className={`cursor-pointer ${sortMode === 'priority' ? 'font-medium' : ''}`}
                >
                  Priority
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="p-2 space-y-1 select-none">
            {showAddRow && addTaskRow}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(_event: DragStartEvent) => setIsDraggingTask(true)}
              onDragCancel={() => setIsDraggingTask(false)}
              onDragEnd={(event: DragEndEvent) => {
                setIsDraggingTask(false);
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
                const newIndex = filteredTasks.findIndex((t) => t.id === over.id);
                const reordered = arrayMove(filteredTasks, oldIndex, newIndex);
                const newIds = reordered.map((t) => t.id);
                setLocalOrderedIds(newIds);
                onTaskReorder?.(newIds);
              }}
            >
              <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {filteredTasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onComplete={onTaskComplete}
                    onUncomplete={onTaskUncomplete}
                    onDelete={onTaskDelete}
                    onUpdate={onTaskUpdate}
                    onStart={onTaskStart}
                    onEdit={onTaskEdit}
                    onSaveToRoutine={onTaskSaveToRoutine}
                    isActive={currentActivityName === task.name}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* Quick Capture Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => openCapture('text')}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <DocumentTextIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Text</span>
        </Button>
        <Button
          onClick={() => openCapture('camera')}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <CameraIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Photo</span>
        </Button>
        <Button
          onClick={() => openCapture('voice')}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <MicrophoneIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Voice</span>
        </Button>
      </div>

      {/* Empty state */}
      {notesLoading && <div className="text-sm text-muted-foreground mb-4">Loading...</div>}
      {!notesLoading && filteredTasks.length === 0 && filteredNotes.length === 0 && (
        <div className="text-sm text-muted-foreground mb-4">Nothing for this day yet.</div>
      )}
      {/* Notes for Selected Day */}
      {filteredNotes.length > 0 && (
        <div className="bg-card border border-border rounded-control mb-4">
          <div className="bg-muted/80 px-4 py-2 border-b border-border rounded-t-lg">
            <h3 className="font-semibold text-sm text-foreground">Notes</h3>
          </div>
          <div className="p-2 space-y-3">
            {filteredNotes.map((note) => {
              // Get photos for this note (photos are stored with impactId = note.id)
              const photos: PhotoAttachment[] = getPhotosForImpact(note.id);

              return (
                <article
                  key={note.id}
                  className="group rounded-card border border-border/80 bg-muted/30 overflow-hidden transition-colors hover:bg-muted/50"
                >
                  <div className="p-3 sm:p-4">
                    {note.text && (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        <HighlightedMentions text={note.text} />
                      </p>
                    )}
                    {photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => {
                              setLightboxPhoto(photo);
                              setLightboxSrc(null);
                              getFullImage(photo).then((src) => setLightboxSrc(src ?? photo.thumbnail));
                            }}
                            className="rounded-control overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <Image
                              src={photo.thumbnail}
                              alt="Note photo"
                              width={160}
                              height={160}
                              unoptimized
                              className="w-40 h-40 object-cover rounded-control cursor-pointer"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    {note.photoIds && note.photoIds.length > 0 && photos.length === 0 && (
                      <div className="text-xs text-muted-foreground border border-yellow-500 p-2 rounded mt-2">
                        Debug: Note has {note.photoIds.length} photoId(s): {note.photoIds.join(', ')} but found {photos.length} photos.
                        All photos in hook: {allPhotos.length}.
                        Note ID: {note.id}
                      </div>
                    )}
                    {note.audioPath && (
                      <div className="mt-3">
                        {audioUrlsByNoteId[note.id] ? (
                          <AudioPlayer src={audioUrlsByNoteId[note.id]} compact />
                        ) : (
                          <div className="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                            Loading audio…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 sm:px-4 border-t border-border/60 bg-background/50">
                    <time
                      dateTime={new Date(note.createdAt).toISOString()}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </time>
                    <Button
                      onClick={() => handleDeleteNote(note.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 opacity-70 hover:opacity-100 hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Modal */}
      <Modal isOpen={showModal} closeModal={closeCapture}>
        <Modal.Title>
          {mode === 'text' && 'Quick Text Note'}
          {mode === 'camera' && 'Take Photo'}
          {mode === 'voice' && 'Record Voice Note'}
        </Modal.Title>
        <Modal.Body>
          <div className="mt-4">
            {captureContent}
          </div>
        </Modal.Body>
      </Modal>

      {/* Image lightbox — click note photo to view large */}
      <Dialog
        open={!!lightboxPhoto}
        onOpenChange={(open) => { if (!open) { setLightboxPhoto(null); setLightboxSrc(null); } }}
      >
        <DialogContent className="max-w-4xl bg-black/90 border-none shadow-none p-4 flex items-center justify-center">
          {lightboxPhoto && (lightboxSrc ?? lightboxPhoto.thumbnail) && (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic blob/data URL of unknown natural size, rendered at intrinsic aspect ratio via w-auto/h-auto
            <img
              src={lightboxSrc ?? lightboxPhoto.thumbnail}
              alt="Note photo"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-control mx-auto"
            />
          )}
          {lightboxPhoto && !lightboxSrc && lightboxPhoto.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic blob/data URL of unknown natural size, rendered at intrinsic aspect ratio via w-auto/h-auto
            <img
              src={lightboxPhoto.thumbnail}
              alt="Note photo"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-control mx-auto animate-pulse"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Drawer */}
      <Drawer open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {mode === 'text' && 'Quick Text Note'}
              {mode === 'camera' && 'Take Photo'}
              {mode === 'voice' && 'Record Voice Note'}
            </DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 min-h-[44px] min-w-[44px] flex items-center justify-center" />
          </DrawerHeader>
          <div className="px-4 pb-8">
            {captureContent}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Voice fullscreen overlay */}
      {voiceFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            backgroundColor: voiceAnimated ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0)',
            transition: 'background-color 0.3s ease',
          }}
        >
          {/* Close button */}
          <button
            onClick={closeVoiceFullscreen}
            className="absolute top-6 right-6 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white transition-colors"
            style={{
              opacity: voiceAnimated ? 1 : 0,
              transition: 'opacity 0.2s ease 0.3s',
            }}
          >
            <XIcon className="w-6 h-6" />
          </button>

          {/* Mic icon — grows into view */}
          <div
            style={{
              transform: voiceAnimated ? 'scale(1)' : 'scale(0.15)',
              opacity: voiceAnimated ? 1 : 0,
              transition: 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease',
            }}
          >
            <MicrophoneIcon
              className={`w-28 h-28 ${isRecording ? 'text-red-400' : 'text-primary'}`}
              style={isRecording ? { filter: 'drop-shadow(0 0 24px rgba(248,113,113,0.6))' } : {}}
            />
          </div>

          {/* Recording controls — fade in after mic grows */}
          <div
            className="mt-10 flex flex-col items-center gap-6 w-full max-w-xs px-6"
            style={{
              opacity: voiceAnimated ? 1 : 0,
              transform: voiceAnimated ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.3s ease 0.35s, transform 0.3s ease 0.35s',
            }}
          >
            {!audioBlob ? (
              !isRecording ? (
                <Button onClick={startRecording} size="lg" className="w-full">
                  <MicrophoneIcon className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="text-4xl font-semibold text-white tabular-nums">
                    {formatTime(recordingTime)}
                  </div>
                  <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full">
                    <StopIcon className="w-5 h-5 mr-2" />
                    Stop Recording
                  </Button>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4 w-full">
                {audioUrl && <AudioPlayer src={audioUrl} title="Preview" />}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); }}
                    variant="outline"
                    className="flex-1"
                  >
                    Record Again
                  </Button>
                  <Button
                    onClick={async () => { await handleSave(); closeVoiceFullscreen(); }}
                    className="flex-1"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
