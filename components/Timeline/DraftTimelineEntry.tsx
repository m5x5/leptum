import { useState, useRef } from "react";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { MentionInput, HighlightedMentions } from "../ui/mention-input";
import { Button } from "../ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
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
  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { entities } = useEntities();
  const containerRef = useRef<HTMLDivElement>(null);


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
    <PopoverContent
      side="bottom"
      align="start"
      sideOffset={8}
      collisionPadding={16}
      onOpenAutoFocus={(e) => e.preventDefault()}
      // Clicks on the draft block itself (resize, move) must not cancel it.
      onInteractOutside={(e) => {
        if (containerRef.current?.contains(e.target as Node)) e.preventDefault();
      }}
      className="z-[9999] p-3 min-w-[280px] w-auto max-w-[min(400px,90vw)]"
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
              className="flex h-10 rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm max-w-[200px]"
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!activity.trim()}
          >
            Save
          </Button>
        </div>
      </form>
    </PopoverContent>
  );

  return (
    <>
      <div
        ref={containerRef}
        className="relative z-10 rounded-control border border-border shadow-sm overflow-hidden"
        style={{ height: `${barHeight}px`, minHeight: 32 }}
      >
        <div className="h-full flex flex-col p-2 overflow-hidden bg-card relative">
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getSelectedGoalColor()}`}
          />
          <div className="flex items-center gap-1 min-w-0 pl-3">
            <span className="text-sm font-semibold truncate text-foreground">
              {activity ? <HighlightedMentions text={activity} /> : "New Activity..."}
            </span>
          </div>
          {!isShortActivity && (
            <div className="flex items-center justify-between gap-1 min-h-0 pl-3 mt-0.5">
              <span className="text-xs text-muted-foreground shrink-0">
                {formatTime(startTime)}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {getDurationString()}
              </span>
            </div>
          )}
        </div>
      </div>
      <Popover open onOpenChange={(open) => { if (!open) onCancel(); }}>
        <PopoverAnchor virtualRef={containerRef} />
        {formContent}
      </Popover>
    </>
  );
}
