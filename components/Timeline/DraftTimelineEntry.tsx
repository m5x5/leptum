import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  /** When provided (calendar context), use this for the visual block height instead of duration-based calc */
  slotHeightPx?: number;
}

export default function DraftTimelineEntry({
  startTime,
  endTime,
  onCancel,
  onSubmit,
  formatTime,
  slotHeightPx,
}: DraftTimelineEntryProps) {
  const [activity, setActivity] = useState("");
  const [goalId, setGoalId] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { entities } = useEntities();
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      onCancel();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  const barHeight = slotHeightPx ?? Math.max(12, durationMinutes * 2);
  const isShortActivity = barHeight < 40;

  const getSelectedGoalColor = () => {
    if (!goalId || !goals) return "bg-gray-400";
    const goal = goals.find((g) => g.id === goalId);
    return goal ? goal.color : "bg-gray-400";
  };

  const formContent = (
    <div
      ref={popoverRef}
      className="fixed p-3 bg-popover shadow-xl rounded-lg border border-border z-[9999] min-w-[280px] max-w-[min(400px,90vw)]"
      style={{ top: popoverPosition.top, left: popoverPosition.left }}
    >
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
              {goalTypes?.map((goalType) => {
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
          <div className="flex-1" />
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
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="relative z-10">
        <div className="relative flex items-start opacity-70">
          <div
            className={`absolute left-[-1.45rem] w-1 ${getSelectedGoalColor()}`}
            style={{ height: `${barHeight}px` }}
          />
          <div
            className={`bg-card border-b border-border flex-1 min-w-0 ${isShortActivity ? "pb-2" : "pb-3"}`}
            style={{ minHeight: `${barHeight}px` }}
          >
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold text-foreground/80 italic truncate">
                {activity ? (
                  <HighlightedMentions text={activity} />
                ) : (
                  "New Activity..."
                )}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                <span className="font-mono whitespace-nowrap">
                  {formatTime(startTime)}
                </span>
                <span className="px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground whitespace-nowrap">
                  {getDurationString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {typeof document !== "undefined" && createPortal(formContent, document.body)}
    </>
  );
}
