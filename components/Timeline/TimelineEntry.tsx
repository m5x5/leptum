import { ProcessedAWEvent, EventGroup } from '../../activity-watch.d';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/solid';
import { useState } from 'react';
import { TimeBlock, getBlockActivityBreakdown, isLoginWindowOnlyBlock } from '../../utils/timeBlocks';

interface ActivityWatchEntryProps {
  event: ProcessedAWEvent;
  duration: string;
  barHeight: number;
  isShortActivity: boolean;
  formatTime: (timestamp: number) => string;
  onClick: () => void;
  onCreateManual?: () => void;
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
  onCreateManual,
}: ActivityWatchEntryProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative flex items-start group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Bar (left side) */}
      <div
        className={`absolute left-[-1.45rem] w-3 rounded-sm ${event.color} border-background`}
        style={{ height: `${barHeight}px` }}
      />

      <div
        className={`bg-card border-b hover:shadow-md transition-shadow cursor-pointer flex-1 ${
          isShortActivity ? 'pb-2' : 'pb-3'
        }`}
        style={{ minHeight: `${barHeight}px` }}
      >
        <div className="flex items-center justify-between" onClick={onClick}>
          <div className="flex items-center gap-3">
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

        {/* Quick Actions */}
        {showActions && onCreateManual && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateManual();
              }}
              className="text-xs px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium"
            >
              + Create Manual Entry
            </button>
          </div>
        )}
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
  onCreateManual?: (event: ProcessedAWEvent) => void;
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
  onCreateManual,
}: EventGroupEntryProps) {
  const [isExpanded, setIsExpanded] = useState(group.isExpanded || false);
  const [showActions, setShowActions] = useState(false);

  const occurrenceCount = group.occurrences.length;
  const totalDurationMs = group.totalDuration * 1000;

  // Calculate if this group is "live" (last event is ongoing today)
  const lastEvent = group.occurrences[group.occurrences.length - 1];
  const lastEventEnd = lastEvent.timestamp + (lastEvent.duration * 1000);
  const isLive = isToday && lastEventEnd > currentTime - 60000; // Within last minute

  return (
    <div
      className="relative flex items-start group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Grouped bar (left side) */}
      <div
        className={`absolute left-[-1.45rem] w-3 rounded-sm ${group.color}`}
        style={{ height: `${barHeight}px` }}
      />

      <div className="bg-card border-b hover:shadow-md transition-shadow flex-1">
        {/* Group Header */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={`group-details-${group.timeRange.start}`}
          aria-label={`Toggle group: ${group.displayName}`}
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          style={{ minHeight: `${barHeight}px` }}
        >
          <div className="flex items-center gap-3">
            {/* Time Range */}
            <span className="text-sm font-mono text-muted-foreground">
              {formatTime(group.timeRange.start)}
            </span>

            {/* Display Name */}
            <h3 className="text-base font-semibold text-foreground">
              {group.displayName}
            </h3>

            {/* Occurrence Count Badge (only if multiple) */}
            {occurrenceCount > 1 && (
              <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent-foreground rounded">
                {occurrenceCount} occurrences
              </span>
            )}

            {isLive && (
              <span className="text-xs text-primary">(Live)</span>
            )}
          </div>

          {/* Create Manual Entry Button (for single occurrence) or Duration */}
          {occurrenceCount === 1 && onCreateManual ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateManual(group.occurrences[0]);
              }}
              className="text-xs px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium ml-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
              aria-label={`Create manual entry for ${group.displayName}`}
            >
              + Create Manual Entry
            </button>
          ) : (
            <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium" aria-label={`Total duration ${formatDuration(totalDurationMs)}`}>
              {formatDuration(totalDurationMs)}
            </span>
          )}
        </div>

        {/* Expanded Event List */}
        {isExpanded && (
          <div 
            id={`group-details-${group.timeRange.start}`}
            className="mt-3 ml-8 space-y-2 border-l-2 border-border pl-4"
            role="region"
            aria-label={`${group.displayName} occurrences`}
          >
            {group.occurrences.map((event, idx) => {
              const eventDuration = event.duration * 1000;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors group/item focus-within:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono" aria-hidden="true">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono" aria-label={`At ${formatTime(event.timestamp)}`}>
                      {formatTime(event.timestamp)}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-background rounded" aria-label={`Type: ${event.bucketType}`}>
                      {event.bucketType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground" aria-label={`Duration ${formatDuration(eventDuration)}`}>
                      {formatDuration(eventDuration)}
                    </span>
                    {onCreateManual && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateManual(event);
                        }}
                        className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none"
                        aria-label={`Create manual entry for occurrence ${idx + 1}`}
                      >
                        + Manual
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface TimeBlockEntryProps {
  block: TimeBlock;
  formatTime: (timestamp: number) => string;
  formatDuration: (ms: number) => string;
  onEventClick: (event: ProcessedAWEvent) => void;
  onCreateManual?: (event: ProcessedAWEvent) => void;
}

/**
 * Component for rendering time blocks with dominant activity
 */
export function TimeBlockEntry({
  block,
  formatTime,
  formatDuration,
  onEventClick,
  onCreateManual,
}: TimeBlockEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dominantEvent = block.dominantActivity;
  const blockDurationMinutes = (block.endTime - block.startTime) / (1000 * 60);
  const barHeight = Math.max(12, blockDurationMinutes * 2);

  // Format time range for the block
  const timeRange = `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`;

  // Check if this is a loginwindow-only block (inactive computer)
  const isLoginWindowOnly = isLoginWindowOnlyBlock(block);

  // Get breakdown of all activities in this block
  const breakdown = getBlockActivityBreakdown(block);
  const hasMultipleActivities = breakdown.length > 1;

  // If loginwindow-only, render empty block
  if (isLoginWindowOnly) {
    return (
      <div className="relative flex items-start">
        {/* Empty/gray bar for inactive time */}
        <div
          className="absolute left-[-1.45rem] w-3 rounded-sm bg-muted/50"
          style={{ height: `${barHeight}px` }}
        />

        <div className="bg-card border-b flex-1">
          <div
            className="flex items-center justify-between p-2"
            style={{ minHeight: `${barHeight}px` }}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Time Range */}
              <span className="text-sm font-mono text-muted-foreground/60 whitespace-nowrap">
                {timeRange}
              </span>

              {/* Empty state indicator */}
              <span className="text-sm text-muted-foreground/40 italic">
                (Inactive)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-start group">
      {/* Color bar for dominant activity */}
      <div
        className={`absolute mr-2 w-1 rounded-sm ${dominantEvent.color}`}
        style={{ height: `${barHeight}px` }}
      />

      <div className="bg-card border-b border-dashed border-border hover:shadow-md transition-shadow flex-1">
        {/* Block Header */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={`block-details-${block.startTime}`}
          aria-label={`${hasMultipleActivities ? 'Toggle details for' : 'Details for'} ${dominantEvent.displayName} at ${timeRange}`}
          className={`flex items-start justify-between cursor-pointer p-2 relative outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
            hasMultipleActivities ? 'hover:bg-muted/30' : ''
          }`}
          onClick={() => hasMultipleActivities && setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (hasMultipleActivities && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          style={{ minHeight: `${barHeight}px` }}
        >
          <div className="flex items-center gap-3 flex-1">
            {/* Time Range */}
            <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
              {timeRange}
            </span>

            {/* Dominant Activity Name */}
            <h3 className="text-base font-semibold text-foreground truncate">
              {dominantEvent.displayName}
            </h3>
          </div>

          {/* Create Manual Entry Button (for single activity blocks) */}
          {!hasMultipleActivities && onCreateManual && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateManual(dominantEvent);
              }}
              className="text-xs px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium ml-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
              aria-label={`Create manual entry for ${dominantEvent.displayName}`}
            >
              + To Entry
            </button>
          )}
        </div>

        {/* Expanded Details - Layer View */}
        {isExpanded && hasMultipleActivities && (
          <div 
            id={`block-details-${block.startTime}`}
            className="pb-2 absolute top-full left-6 z-20 bg-popover rounded-lg shadow-lg border border-border mt-1 min-w-[300px]"
            role="region"
            aria-label="Activity breakdown"
          >
            <div className="p-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                Activities in this {blockDurationMinutes}min block:
              </div>
              {breakdown.map(({ event, duration, percentage }, idx) => (
                <div
                  key={`${event.id}-${idx}`}
                  className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 transition-colors group/item focus-within:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Activity indicator bar */}
                    <div
                      className={`w-1 h-8 rounded ${event.color} flex-shrink-0`}
                      aria-hidden="true"
                    />

                    {/* Activity details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {event.displayName}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded flex-shrink-0" aria-label={`Type: ${event.bucketType}`}>
                          {event.bucketType}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span aria-label={`Started at ${formatTime(event.timestamp)}`}>{formatTime(event.timestamp)}</span> • <span aria-label={`Duration ${formatDuration(duration)}`}>{formatDuration(duration)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="text-xs px-2 py-1 bg-secondary/50 text-secondary-foreground rounded hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none"
                        aria-label={`View details for ${event.displayName}`}
                      >
                        Details
                      </button>
                      {onCreateManual && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateManual(event);
                          }}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none"
                          aria-label={`Create manual entry for ${event.displayName}`}
                        >
                          + Manual
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
