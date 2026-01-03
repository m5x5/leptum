import { useState, useRef, useEffect } from "react";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { MentionInput, HighlightedMentions } from "../ui/mention-input";
import { useEntities } from "../../utils/useEntities";

interface DraftTimelineEntryProps {
  startTime: number;
  endTime: number;
  onCancel: () => void;
  onSubmit: (data: { activity: string; goalId: string }) => void;
  formatTime: (timestamp: number) => string;
}

export default function DraftTimelineEntry({ 
  startTime, 
  endTime, 
  onCancel, 
  onSubmit, 
  formatTime 
}: DraftTimelineEntryProps) {
  const [activity, setActivity] = useState("");
  const [goalId, setGoalId] = useState("");
  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { entities } = useEntities();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to cancel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;
    onSubmit({ activity, goalId });
  };

  const getDurationString = () => {
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const durationMinutes = (endTime - startTime) / (1000 * 60);
  const barHeight = Math.max(12, durationMinutes * 2);
  const isShortActivity = durationMinutes < 15;

  const getSelectedGoalColor = () => {
    if (!goalId || !goals) return "bg-gray-400";
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.color : "bg-gray-400";
  };

  return (
    <div ref={containerRef} className="relative z-10">
      {/* The Visual Block Preview */}
      <div className="relative flex items-start opacity-70">
        <div
          className={`absolute left-[-1.45rem] w-1 ${getSelectedGoalColor()}`}
          style={{ height: `${barHeight}px` }}
        ></div>

        <div
          className={`bg-card border-b border-border flex-1 min-w-0 ${isShortActivity ? 'pb-2' : 'pb-3'}`}
          style={{ minHeight: `${barHeight}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-mono text-muted-foreground/80 whitespace-nowrap shrink-0">
                {formatTime(startTime)}
              </span>
              <h3 className="text-sm font-semibold text-foreground/80 italic truncate">
                {activity ? <HighlightedMentions text={activity} /> : "New Activity..."}
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground whitespace-nowrap shrink-0">
              {getDurationString()}
            </span>
          </div>
        </div>
      </div>

      {/* The Form Popover - Positioned Below */}
      <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-popover shadow-xl rounded-lg border border-border animate-in fade-in slide-in-from-top-2 z-20">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <MentionInput
              placeholder="Type activity name (use @ to mention)..."
              className="text-base"
              value={activity}
              onChange={(value) => setActivity(value)}
              entities={entities}
              autoFocus
            />

            <div className="flex items-center gap-2">
              {goals && goals.length > 0 && (
                <select
                  className="text-sm bg-muted/50 border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary max-w-[200px]"
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                >
                  <option value="">No Goal</option>
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
              )}

              <div className="flex-1"></div>

              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!activity.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Save
              </button>
            </div>
        </form>
        {/* Simple arrow pointing up */}
        <div className="absolute -top-1.5 left-8 w-3 h-3 bg-popover border-t border-l border-border transform rotate-45"></div>
      </div>
    </div>
  );
}
