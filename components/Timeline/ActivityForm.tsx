import { useState, useEffect, useRef } from "react";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { Input } from "../ui/input";
import { MentionInput } from "../ui/mention-input";
import { useEntities } from "../../utils/useEntities";
import { generateThumbnail, PhotoAttachment } from "../../utils/usePhotoAttachments";
import Image from "next/image";
import { PhotographIcon, XIcon } from "@heroicons/react/solid";

interface PendingPhoto {
  id: string;
  file: File;
  thumbnail: string;
  width: number;
  height: number;
}

interface ActivityFormProps {
  initialData?: {
    activity: string;
    date: string;
    time: string;
    goalId: string;
  };
  onSubmit: (data: {
    activity: string;
    date: string;
    time: string;
    goalId: string;
    pendingPhotos?: PendingPhoto[];
  }) => void;
  onCancel: () => void;
  submitLabel?: string;
  showDelete?: boolean;
  onDelete?: () => void;
  existingPhotos?: PhotoAttachment[];
  onDeletePhoto?: (photoId: string) => void;
}

/**
 * Round time to nearest 15-minute boundary
 */
function roundToNearest15Minutes(timeString: string): string {
  if (!timeString) return timeString;

  const [hours, minutes] = timeString.split(':').map(Number);
  const roundedMinutes = Math.round(minutes / 15) * 15;

  let finalHours = hours;
  let finalMinutes = roundedMinutes;

  // Handle overflow (e.g., 23:52 -> 00:00)
  if (finalMinutes === 60) {
    finalMinutes = 0;
    finalHours = (finalHours + 1) % 24;
  }

  return `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
}

export default function ActivityForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  showDelete = false,
  onDelete,
  existingPhotos = [],
  onDeletePhoto,
}: ActivityFormProps) {
  const [formData, setFormData] = useState(
    initialData || {
      activity: "",
      date: "",
      time: "",
      goalId: "",
    }
  );
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { entities } = useEntities();

  // Update form when initial data changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      // Round the time to nearest 15 minutes
      const roundedTime = roundToNearest15Minutes(initialData.time);
      setFormData({ ...initialData, time: roundedTime });
    }
  }, [initialData]);

  const handleSubmit = () => {
    if (!formData.activity || !formData.date || !formData.time) {
      alert("Please fill in all fields");
      return;
    }
    onSubmit({
      ...formData,
      pendingPhotos: pendingPhotos.length > 0 ? pendingPhotos : undefined,
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const { thumbnail, width, height } = await generateThumbnail(file);
        const pendingPhoto: PendingPhoto = {
          id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          thumbnail,
          width,
          height,
        };
        setPendingPhotos(prev => [...prev, pendingPhoto]);
      }
    } catch (error) {
      console.error('Failed to process photo:', error);
    } finally {
      setIsProcessingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePendingPhoto = (id: string) => {
    setPendingPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Activity Name
        </label>
        <MentionInput
          placeholder="What were you doing? (use @ to mention)"
          className="text-lg"
          value={formData.activity}
          onChange={(value) =>
            setFormData({ ...formData, activity: value })
          }
          entities={entities}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Start Date
        </label>
        <Input
          type="date"
          className="text-lg"
          value={formData.date}
          onChange={(e) =>
            setFormData({ ...formData, date: e.target.value })
          }
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Start Time <span className="text-xs text-muted-foreground">(rounded to 15 min)</span>
        </label>
        <Input
          type="time"
          step="900"
          className="text-lg"
          value={formData.time}
          onChange={(e) => {
            const roundedTime = roundToNearest15Minutes(e.target.value);
            setFormData({ ...formData, time: roundedTime });
          }}
          onBlur={(e) => {
            // Also round on blur to ensure it's always rounded
            const roundedTime = roundToNearest15Minutes(e.target.value);
            setFormData({ ...formData, time: roundedTime });
          }}
        />
      </div>

      {/* Goal Selection */}
      {goals && goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Related Goal (optional)
          </label>
          <select
            className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
            value={formData.goalId}
            onChange={(e) =>
              setFormData({ ...formData, goalId: e.target.value })
            }
          >
            <option value="">No goal</option>
            {goalTypes && goalTypes.map((goalType) => {
              const typeGoals = goals.filter((g) => g.type === goalType.id);
              if (typeGoals.length === 0) return null;
              return (
                <optgroup key={goalType.id} label={goalType.name}>
                  {typeGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      {/* Photo Attachments */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Photos (optional)
        </label>

        {/* Existing Photos (in edit mode) */}
        {existingPhotos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <Image
                  src={photo.thumbnail}
                  alt="Attached photo"
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                />
                {onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    className="absolute -top-1 -right-1 min-h-[44px] min-w-[44px] bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending Photos (being added) */}
        {pendingPhotos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <Image
                  src={photo.thumbnail}
                  alt="Pending photo"
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 object-cover rounded-lg border border-primary"
                />
                <button
                  type="button"
                  onClick={() => removePendingPhoto(photo.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Photo Button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`flex min-h-[44px] items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg cursor-pointer hover:bg-muted/80 transition-colors ${
              isProcessingPhoto ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            <PhotographIcon className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isProcessingPhoto ? 'Processing...' : 'Add Photo'}
            </span>
          </label>
          {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
            <span className="text-xs text-muted-foreground">
              {existingPhotos.length + pendingPhotos.length} photo(s)
            </span>
          )}
        </div>
      </div>

      {!showDelete && (
        <p className="text-sm text-muted-foreground">
          The end time will be automatically determined by the next activity you logged.
        </p>
      )}

      {/* Action Buttons */}
      <div className={`flex gap-2 ${showDelete ? 'justify-between' : 'justify-end'} pt-2`}>
        {showDelete && onDelete && (
          <button
            onClick={onDelete}
            className="min-h-[44px] px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 font-semibold"
          >
            Delete
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
