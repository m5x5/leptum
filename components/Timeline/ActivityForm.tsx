import { useState, useEffect } from "react";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";

interface ActivityFormProps {
  initialData?: {
    activity: string;
    date: string;
    time: string;
    goalId: string;
  };
  onSubmit: (data: { activity: string; date: string; time: string; goalId: string }) => void;
  onCancel: () => void;
  submitLabel?: string;
  showDelete?: boolean;
  onDelete?: () => void;
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
}: ActivityFormProps) {
  const [formData, setFormData] = useState(
    initialData || {
      activity: "",
      date: "",
      time: "",
      goalId: "",
    }
  );

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();

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
    onSubmit(formData);
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Activity Name
        </label>
        <input
          type="text"
          placeholder="What were you doing?"
          className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
          value={formData.activity}
          onChange={(e) =>
            setFormData({ ...formData, activity: e.target.value })
          }
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Start Date
        </label>
        <input
          type="date"
          className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
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
        <input
          type="time"
          step="900"
          className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
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
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 font-semibold"
          >
            Delete
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
