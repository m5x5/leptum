import { useState, useEffect, useRef, type MutableRefObject } from "react";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { Input } from "../ui/input";
import { MentionInput } from "../ui/mention-input";
import { useEntities } from "../../utils/useEntities";
import { generateThumbnail, PhotoAttachment } from "../../utils/usePhotoAttachments";
import Image from "next/image";
import { PhotographIcon, XIcon } from "@heroicons/react/solid";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";

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
    endDate?: string;
    endTime?: string;
    goalId: string;
    requiresOnlineTime?: boolean;
  };
  onSubmit: (data: {
    activity: string;
    date: string;
    time: string;
    endDate?: string;
    endTime?: string;
    goalId: string;
    requiresOnlineTime?: boolean;
    pendingPhotos?: PendingPhoto[];
  }) => void;
  onCancel: () => void;
  submitLabel?: string;
  showDelete?: boolean;
  onDelete?: () => void;
  existingPhotos?: PhotoAttachment[];
  onDeletePhoto?: (photoId: string) => void;
  submitRef?: MutableRefObject<(() => void) | null>;
  hideSubmit?: boolean;
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
  submitRef,
  hideSubmit = false,
}: ActivityFormProps) {
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        endDate: initialData.endDate ?? "",
        endTime: initialData.endTime ?? "",
        requiresOnlineTime: initialData.requiresOnlineTime ?? false,
      };
    }
    return {
      activity: "",
      date: "",
      time: "",
      endDate: "",
      endTime: "",
      goalId: "",
      requiresOnlineTime: false,
    };
  });
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { entities } = useEntities();

  // Update form when initial data changes (for edit mode)
  const prevInitialDataRef = useRef(initialData);
  useEffect(() => {
    if (prevInitialDataRef.current === initialData || !initialData) return;
    prevInitialDataRef.current = initialData;
    const roundedTime = roundToNearest15Minutes(initialData.time);
    const base = { ...initialData, time: roundedTime };
    setFormData({
      ...base,
      endDate: initialData.endDate ?? "",
      endTime: initialData.endTime ?? "",
      requiresOnlineTime: initialData.requiresOnlineTime ?? false,
    });
  }, [initialData]);

  const submit = (silent: boolean) => {
    if (!formData.activity || !formData.date || !formData.time) {
      if (!silent) {
        alert("Please fill in name, start date, and start time");
      }
      return;
    }
    const { endDate, endTime, ...rest } = formData;
    onSubmit({
      ...rest,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
      requiresOnlineTime: formData.requiresOnlineTime || undefined,
      pendingPhotos: pendingPhotos.length > 0 ? pendingPhotos : undefined,
    });
  };

  const handleSubmit = () => submit(false);

  // Expose handleSubmit to parent via ref
  useEffect(() => {
    if (submitRef) {
      submitRef.current = handleSubmit;
    }
    return () => { if (submitRef) submitRef.current = null; };
  });

  // Autosave — when hideSubmit is on, debounce-save valid form changes silently.
  const isFirstAutosaveRef = useRef(true);
  useEffect(() => {
    if (!hideSubmit) return;
    if (isFirstAutosaveRef.current) {
      isFirstAutosaveRef.current = false;
      return;
    }
    const t = setTimeout(() => submit(true), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideSubmit, formData, pendingPhotos]);

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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Name
        </label>
        <MentionInput
          placeholder="What were you doing? (use @ to mention)"
          className="text-sm"
          value={formData.activity}
          onChange={(value) =>
            setFormData({ ...formData, activity: value })
          }
          entities={entities}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Start
          </label>
          <Input
            type="datetime-local"
            step="900"
            className="text-sm"
            value={formData.date && formData.time ? `${formData.date}T${formData.time}` : ""}
            onChange={(e) => {
              const [d, t] = e.target.value.split("T");
              setFormData({
                ...formData,
                date: d ?? "",
                time: t ? roundToNearest15Minutes(t) : "",
              });
            }}
            onBlur={(e) => {
              const [d, t] = e.target.value.split("T");
              if (t) {
                setFormData({
                  ...formData,
                  date: d ?? formData.date,
                  time: roundToNearest15Minutes(t),
                });
              }
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            End
          </label>
          <Input
            type="datetime-local"
            step="900"
            className="text-sm"
            value={formData.endDate && formData.endTime ? `${formData.endDate}T${formData.endTime}` : ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setFormData({ ...formData, endDate: "", endTime: "" });
                return;
              }
              const [d, t] = val.split("T");
              setFormData({
                ...formData,
                endDate: d ?? "",
                endTime: t ? roundToNearest15Minutes(t) : "",
              });
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (!val) return;
              const [d, t] = val.split("T");
              if (t) {
                setFormData({
                  ...formData,
                  endDate: d ?? formData.endDate ?? "",
                  endTime: roundToNearest15Minutes(t),
                });
              }
            }}
          />
        </div>
      </div>

      {/* Goal Selection */}
      {goals && goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Related Goal
          </label>
          <Select
            value={formData.goalId || "__none__"}
            onValueChange={(v) =>
              setFormData({ ...formData, goalId: v === "__none__" ? "" : v })
            }
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="No goal" />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="__none__">No goal</SelectItem>
              {goalTypes && goalTypes.map((goalType) => {
                const typeGoals = goals.filter((g) => g.type === goalType.id && g.status !== "archived");
                if (typeGoals.length === 0) return null;
                return (
                  <SelectGroup key={goalType.id}>
                    <SelectLabel>{goalType.name}</SelectLabel>
                    {typeGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Photo Attachments — hidden for now */}
      <div className="hidden">
        <label className="block text-sm font-medium text-foreground mb-2">
          Photos
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
                  className="w-16 h-16 object-cover rounded-control border border-border"
                />
                {onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    className="absolute -top-1 -right-1 min-h-[44px] min-w-[44px] bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
                  className="w-16 h-16 object-cover rounded-control border border-primary"
                />
                <button
                  type="button"
                  onClick={() => removePendingPhoto(photo.id)}
                  className="absolute -top-2 -right-2 min-h-[44px] min-w-[44px] bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
            className={`flex h-10 items-center gap-2 px-3 py-2 rounded-chip border border-input bg-background text-base ring-offset-background cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors md:text-sm ${
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

      {/* Online Time Toggle */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">Requires online time</span>
        <Switch
          checked={formData.requiresOnlineTime ?? false}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, requiresOnlineTime: checked })
          }
        />
      </div>

      {!showDelete && (
        <p className="text-sm text-muted-foreground">
          The end time will be automatically determined by the next activity you logged.
        </p>
      )}

      {/* Action Buttons */}
      <div className={`flex gap-2 ${showDelete ? 'justify-between' : 'justify-end'} pt-2`}>
        {showDelete && onDelete && (
          <Button
            variant="ghost-destructive"
            size="sm"
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
        {!hideSubmit && (
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              className="flex-1"
            >
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
