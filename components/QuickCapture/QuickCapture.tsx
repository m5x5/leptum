import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CameraIcon, MicrophoneIcon, DocumentTextIcon, XIcon, StopIcon, PlayIcon } from '@heroicons/react/solid';
import { useQuickNotes, QuickNote } from '../../utils/useQuickNotes';
import { usePhotoAttachments, PhotoAttachment } from '../../utils/usePhotoAttachments';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import Modal from '../Modal';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '../ui/drawer';

export default function QuickCapture() {
  const { notes, addNote, updateNote, deleteNote, saveAudio, getAudio, loading: notesLoading } = useQuickNotes();
  const { addPhoto, getPhotosForImpact, photos: allPhotos } = usePhotoAttachments();
  
  const [showModal, setShowModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [mode, setMode] = useState<'text' | 'camera' | 'voice' | null>(null);
  const [text, setText] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const openCapture = (captureMode: 'text' | 'camera' | 'voice') => {
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

  const closeCapture = () => {
    setMode(null);
    setText('');
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

  const handleSave = async () => {
    if (!text.trim() && pendingPhotos.length === 0 && !audioBlob) {
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
        text: text.trim() || undefined,
        audioDuration,
      };

      const newNote = await addNote(noteData);
      if (!newNote) {
        throw new Error('Failed to create note');
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
      // We don't need to refresh here as it might overwrite the state before RemoteStorage syncs

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

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const playAudio = async (note: QuickNote) => {
    if (!note.audioPath) return;
    try {
      setPlayingAudioId(note.id);
      const blob = await getAudio(note);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlayingAudioId(null);
        };
        audio.onerror = () => {
          setPlayingAudioId(null);
        };
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudioId(null);
    }
  };

  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [notes]);

  // Focus textarea only when text mode is first opened
  useEffect(() => {
    if (mode === 'text' && textareaRef.current && text.length === 0) {
      // Small delay to ensure modal/drawer is fully rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [mode, text.length]);

  const captureContent = (
    <div className="space-y-4">
      {mode === 'text' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Quick Note
          </label>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your note here..."
            className="min-h-[120px]"
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
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((preview, index) => (
                <div key={`preview-${index}-${preview.substring(0, 20)}`} className="relative">
                  <img src={preview} alt={`Preview ${index}`} className="w-full h-24 object-cover rounded" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
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
                  <div className="text-4xl font-bold text-primary">
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
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => playAudio({ id: '', createdAt: Date.now(), audioPath: 'temp' } as QuickNote)}
                  variant="outline"
                >
                  <PlayIcon className="w-5 h-5" />
                  Play
                </Button>
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
              {audioUrl && (
                <div className="w-full">
                  <audio src={audioUrl} controls className="w-full" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(text.trim() || pendingPhotos.length > 0 || audioBlob) && (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={closeCapture}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
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

      {/* Recent Notes */}
      {notesLoading && <div className="text-sm text-muted-foreground mb-4">Loading notes...</div>}
      {!notesLoading && recentNotes.length === 0 && (
        <div className="text-sm text-muted-foreground mb-4">No notes yet. Create your first quick note!</div>
      )}
      {recentNotes.length > 0 && (
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Notes</h3>
          {recentNotes.map((note) => {
            // Get photos for this note (photos are stored with impactId = note.id)
            const photos: PhotoAttachment[] = getPhotosForImpact(note.id);

            return (
              <div
                key={note.id}
                className="bg-card border border-border rounded-lg p-3 space-y-2"
              >
                {note.text && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                )}
                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {photos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.thumbnail}
                        alt="Note photo"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                {note.photoIds && note.photoIds.length > 0 && photos.length === 0 && (
                  <div className="text-xs text-muted-foreground border border-yellow-500 p-2 rounded">
                    Debug: Note has {note.photoIds.length} photoId(s): {note.photoIds.join(', ')} but found {photos.length} photos. 
                    All photos in hook: {allPhotos.length}. 
                    Note ID: {note.id}
                  </div>
                )}
                {note.audioPath && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => playAudio(note)}
                      variant="ghost"
                      size="sm"
                      disabled={playingAudioId === note.id}
                    >
                      <PlayIcon className="w-4 h-4" />
                      {note.audioDuration ? formatTime(note.audioDuration) : 'Play'}
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                  <Button
                    onClick={() => handleDeleteNote(note.id)}
                    variant="ghost"
                    size="sm"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
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

      {/* Mobile Drawer */}
      <Drawer open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {mode === 'text' && 'Quick Text Note'}
              {mode === 'camera' && 'Take Photo'}
              {mode === 'voice' && 'Record Voice Note'}
            </DrawerTitle>
            <DrawerClose className="absolute right-4 top-4" />
          </DrawerHeader>
          <div className="px-4 pb-8">
            {captureContent}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
