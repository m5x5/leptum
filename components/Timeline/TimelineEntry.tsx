import { ProcessedAWEvent, EventGroup } from '../../activity-watch.d';
import { ClockIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/solid';
import { useState } from 'react';

interface ActivityWatchEntryProps {
  event: ProcessedAWEvent;
  duration: string;
  barHeight: number;
  isShortActivity: boolean;
  formatTime: (timestamp: number) => string;
  onClick: () => void;
}

/**
 * Component for rendering ActivityWatch events
 */
export function ActivityWatchEntry({
  event,
  duration,
  barHeight,
  isShortActivity,
  formatTime,
  onClick,
}: ActivityWatchEntryProps) {
  return (
    <div className="relative flex items-start">
      {/* Dashed border bar (left side) */}
      <div
        className={`absolute left-[-1.45rem] w-3 rounded-sm ${event.color} border-2 border-dashed border-background`}
        style={{ height: `${barHeight}px` }}
      />

      <div
        className={`bg-card border-b border-dashed border-border hover:shadow-md transition-shadow cursor-pointer flex-1 ${
          isShortActivity ? 'pb-2' : 'pb-3'
        }`}
        style={{ minHeight: `${barHeight}px` }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* AW Badge */}
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded font-medium">
              AW
            </span>

            {/* Clock Icon */}
            <ClockIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            {/* Time */}
            <span className="text-sm font-mono text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>

            {/* Display Name */}
            <h3 className="text-base font-semibold text-foreground">
              {event.displayName}
            </h3>

            {/* Bucket Type Badge */}
            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
              {event.bucketType}
            </span>
          </div>

          {/* Duration Badge */}
          {duration && (
            <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
              {duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface EventGroupEntryProps {
  group: EventGroup;
  isToday: boolean;
  currentTime: number;
  barHeight: number;
  isShortActivity: boolean;
  formatTime: (timestamp: number) => string;
  formatDuration: (ms: number) => string;
  onEventClick: (event: ProcessedAWEvent) => void;
}

/**
 * Component for rendering grouped events
 */
export function EventGroupEntry({
  group,
  isToday,
  currentTime,
  barHeight,
  isShortActivity,
  formatTime,
  formatDuration,
  onEventClick,
}: EventGroupEntryProps) {
  const [isExpanded, setIsExpanded] = useState(group.isExpanded || false);

  const occurrenceCount = group.occurrences.length;
  const totalDurationMs = group.totalDuration * 1000;

  // Calculate if this group is "live" (last event is ongoing today)
  const lastEvent = group.occurrences[group.occurrences.length - 1];
  const lastEventEnd = lastEvent.timestamp + (lastEvent.duration * 1000);
  const isLive = isToday && lastEventEnd > currentTime - 60000; // Within last minute

  return (
    <div className="relative flex items-start">
      {/* Grouped bar (left side) - dashed and thicker */}
      <div
        className={`absolute left-[-1.45rem] w-3 rounded-sm ${group.color} border-2 border-dashed border-background opacity-80`}
        style={{ height: `${barHeight}px` }}
      />

      <div
        className={`bg-card border-b border-dashed border-border flex-1 ${
          isShortActivity ? 'pb-2' : 'pb-3'
        }`}
        style={{ minHeight: `${barHeight}px` }}
      >
        {/* Group Header */}
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}

            {/* AW Badge */}
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded font-medium">
              AW
            </span>

            {/* Clock Icon */}
            <ClockIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            {/* Time Range */}
            <span className="text-sm font-mono text-muted-foreground">
              {formatTime(group.timeRange.start)}
            </span>

            {/* Display Name */}
            <h3 className="text-base font-semibold text-foreground">
              {group.displayName}
            </h3>

            {/* Occurrence Count Badge */}
            <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent-foreground rounded">
              {occurrenceCount} {occurrenceCount === 1 ? 'occurrence' : 'occurrences'}
            </span>

            {isLive && (
              <span className="text-xs text-primary">(Live)</span>
            )}
          </div>

          {/* Total Duration */}
          <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
            {formatDuration(totalDurationMs)}
          </span>
        </div>

        {/* Expanded Event List */}
        {isExpanded && (
          <div className="mt-3 ml-8 space-y-2 border-l-2 border-border pl-4">
            {group.occurrences.map((event, idx) => {
              const eventDuration = event.duration * 1000;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTime(event.timestamp)}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-background rounded">
                      {event.bucketType}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(eventDuration)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
