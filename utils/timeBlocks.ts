import { ProcessedAWEvent } from '../activity-watch.d';

export interface TimeBlock {
  startTime: number;
  endTime: number;
  dominantActivity: ProcessedAWEvent;
  allEvents: ProcessedAWEvent[];
  totalDuration: number;
}

export const DEFAULT_BLOCK_SIZE_MINUTES = 15;

/**
 * Chunk ActivityWatch events into fixed time blocks
 * Each block shows the dominant activity (longest duration)
 *
 * @param events - ActivityWatch events to chunk
 * @param blockSizeMinutes - Size of each block in minutes
 * @param dayStart - Optional start of day timestamp to ensure full coverage
 * @param dayEnd - Optional end of day timestamp to ensure full coverage
 */
export function chunkEventsIntoTimeBlocks(
  events: ProcessedAWEvent[],
  blockSizeMinutes: number = DEFAULT_BLOCK_SIZE_MINUTES,
  dayStart?: number,
  dayEnd?: number
): TimeBlock[] {
  const blockSizeMs = blockSizeMinutes * 60 * 1000;
  const blocks: TimeBlock[] = [];

  // Determine time range
  let minTimestamp: number;
  let maxTimestamp: number;

  if (dayStart && dayEnd) {
    // Use provided day boundaries
    minTimestamp = dayStart;
    maxTimestamp = dayEnd;
  } else if (events.length === 0) {
    // No events and no day boundaries
    return [];
  } else {
    // Find the earliest and latest timestamps from events
    const timestamps = events.map(e => e.timestamp);
    minTimestamp = Math.min(...timestamps);
    maxTimestamp = Math.max(...timestamps.map((t, i) => t + (events[i].duration * 1000)));
  }

  // Round down to nearest block boundary
  const firstBlockStart = Math.floor(minTimestamp / blockSizeMs) * blockSizeMs;

  // Create blocks
  let currentBlockStart = firstBlockStart;
  while (currentBlockStart < maxTimestamp) {
    const blockEnd = currentBlockStart + blockSizeMs;

    // Find all events that overlap with this block
    const blockEvents = events.filter(event => {
      const eventStart = event.timestamp;
      const eventEnd = event.timestamp + (event.duration * 1000);

      // Event overlaps with block if:
      // event starts before block ends AND event ends after block starts
      return eventStart < blockEnd && eventEnd > currentBlockStart;
    });

    if (blockEvents.length > 0) {
      // Calculate how much time each event spent in this block
      const eventDurations: Map<ProcessedAWEvent, number> = new Map();

      blockEvents.forEach(event => {
        const eventStart = event.timestamp;
        const eventEnd = event.timestamp + (event.duration * 1000);

        // Calculate overlap duration
        const overlapStart = Math.max(eventStart, currentBlockStart);
        const overlapEnd = Math.min(eventEnd, blockEnd);
        const overlapDuration = overlapEnd - overlapStart;

        eventDurations.set(event, overlapDuration);
      });

      // Find dominant activity (longest duration in this block)
      // Exclude AFK events and loginwindow from being selected as dominant (if other activities exist)
      const nonAfkEvents = blockEvents.filter(e => e.bucketType !== 'afkstatus');
      const meaningfulEvents = nonAfkEvents.filter(e => e.displayName?.toLowerCase() !== 'loginwindow');
      let dominantActivity = meaningfulEvents.length > 0 ? meaningfulEvents[0] : (nonAfkEvents.length > 0 ? nonAfkEvents[0] : blockEvents[0]);
      let maxDuration = 0;

      eventDurations.forEach((duration, event) => {
        // Skip AFK events when selecting dominant activity
        if (event.bucketType === 'afkstatus') return;

        // Skip loginwindow if there are other meaningful activities
        if (meaningfulEvents.length > 0 && event.displayName?.toLowerCase() === 'loginwindow') return;

        if (duration > maxDuration) {
          maxDuration = duration;
          dominantActivity = event;
        }
      });

      const totalDuration = Array.from(eventDurations.values()).reduce((sum, d) => sum + d, 0);

      blocks.push({
        startTime: currentBlockStart,
        endTime: blockEnd,
        dominantActivity,
        allEvents: blockEvents,
        totalDuration,
      });
    }

    currentBlockStart = blockEnd;
  }

  return blocks;
}

/**
 * Check if a time block consists only of loginwindow entries
 * (meaning the user wasn't actively using the computer)
 */
export function isLoginWindowOnlyBlock(block: TimeBlock): boolean {
  // Get all non-AFK events in the block
  const nonAfkEvents = block.allEvents.filter(e => e.bucketType !== 'afkstatus');

  // If no events, not loginwindow-only
  if (nonAfkEvents.length === 0) return false;

  // Check if all events are loginwindow
  return nonAfkEvents.every(event =>
    event.displayName?.toLowerCase() === 'loginwindow'
  );
}

/**
 * Get activity breakdown for a time block
 */
export function getBlockActivityBreakdown(block: TimeBlock): Array<{
  event: ProcessedAWEvent;
  duration: number;
  percentage: number;
}> {
  const blockSizeMs = block.endTime - block.startTime;
  const breakdown: Array<{ event: ProcessedAWEvent; duration: number; percentage: number }> = [];

  // Check if there are meaningful (non-loginwindow) activities
  const hasMeaningfulActivities = block.allEvents.some(
    e => e.bucketType !== 'afkstatus' && e.displayName?.toLowerCase() !== 'loginwindow'
  );

  block.allEvents.forEach(event => {
    // Skip "Active" AFK events in breakdown, but show "Away" events (which look like duplicates of work but provide important context)
    // We assume if status is NOT 'not-afk', it is AFK/Away.
    if (event.bucketType === 'afkstatus' && event.eventData?.status === 'not-afk') return;


    // Skip loginwindow if there are other meaningful activities
    if (hasMeaningfulActivities && event.displayName?.toLowerCase() === 'loginwindow') return;

    const eventStart = event.timestamp;
    const eventEnd = event.timestamp + (event.duration * 1000);

    // Calculate overlap duration
    const overlapStart = Math.max(eventStart, block.startTime);
    const overlapEnd = Math.min(eventEnd, block.endTime);
    const overlapDuration = overlapEnd - overlapStart;

    if (overlapDuration > 0) {
      breakdown.push({
        event,
        duration: overlapDuration,
        percentage: (overlapDuration / blockSizeMs) * 100,
      });
    }
  });

  // Sort by start time (earliest first)
  breakdown.sort((a, b) => a.event.timestamp - b.event.timestamp);

  return breakdown;
}

/**
 * Merge consecutive time blocks with the same dominant activity
 * This allows activities longer than 15 minutes to display as a single block
 * Also merges consecutive loginwindow-only blocks into single inactive blocks
 */
export function mergeConsecutiveBlocks(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length === 0) return [];

  const merged: TimeBlock[] = [];
  let currentMergedBlock: TimeBlock | null = null;

  blocks.forEach((block) => {
    if (!currentMergedBlock) {
      // Start first merged block
      currentMergedBlock = { ...block };
    } else {
      // Check if this block is consecutive and has same dominant activity
      const isConsecutive = block.startTime === currentMergedBlock.endTime;

      // Check if both are loginwindow-only (inactive) blocks
      const currentIsLoginWindow = isLoginWindowOnlyBlock(currentMergedBlock);
      const blockIsLoginWindow = isLoginWindowOnlyBlock(block);
      const bothLoginWindow = currentIsLoginWindow && blockIsLoginWindow;

      // Or check if they have the same meaningful activity
      const isSameActivity = block.dominantActivity.displayName === currentMergedBlock.dominantActivity.displayName;

      if (isConsecutive && (isSameActivity || bothLoginWindow)) {
        // Merge this block into current
        currentMergedBlock.endTime = block.endTime;
        currentMergedBlock.allEvents = [...currentMergedBlock.allEvents, ...block.allEvents];
        currentMergedBlock.totalDuration += block.totalDuration;
      } else {
        // Different activity or not consecutive, save current and start new
        merged.push(currentMergedBlock);
        currentMergedBlock = { ...block };
      }
    }
  });

  // Push the last merged block
  if (currentMergedBlock) {
    merged.push(currentMergedBlock);
  }

  return merged;
}
