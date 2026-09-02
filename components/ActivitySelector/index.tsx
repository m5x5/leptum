import type { ChangeEvent } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/solid";
import { mentionsToPlainText } from "../ui/mention-input";
import { Button } from "../ui/button";
import type { Impact } from "../../utils/useImpacts";

interface ActivitySelectorProps {
  impacts: Impact[];
  /** Index into `impacts` of the currently selected activity. */
  index: number;
  onChange: (index: number) => void;
  onDelete: () => void;
  onToggleEdit: () => void;
  editMode: boolean;
}

const formatDateTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export default function ActivitySelector({ impacts, index, onChange, onDelete, onToggleEdit, editMode }: ActivitySelectorProps) {
  // Don't render if there are no activities
  if (impacts.length === 0) {
    return (
      <div className="w-full flex justify-center items-center mb-4">
        <div className="text-lg text-muted-foreground">No activities yet</div>
      </div>
    );
  }

  // Create array of impacts with their original indices, then sort by date (most recent first)
  const sortedImpactsWithIndex = impacts
    .map((impact, idx) => ({ impact, originalIndex: idx }))
    .sort((a, b) => (b.impact.date || 0) - (a.impact.date || 0));

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="w-full mb-4">
      <label className="block text-sm font-medium text-foreground mb-2">
        Select Activity to Edit
      </label>
      <div className="flex gap-3 items-center">
        <select
          value={index}
          onChange={handleChange}
          className="flex-1 p-3 bg-card border border-border text-foreground rounded-control focus:border-primary focus:outline-none"
        >
          {sortedImpactsWithIndex.map(({ impact, originalIndex }) => (
            <option key={originalIndex} value={originalIndex}>
              {mentionsToPlainText(impact.activity)} - {formatDateTime(impact.date)}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggleEdit}
          title={editMode ? "Disable edit mode" : "Enable edit mode"}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onDelete}
          title="Delete activity"
        >
          <TrashIcon />
        </Button>
      </div>
    </div>
  );
}
