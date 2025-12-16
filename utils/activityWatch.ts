import {
  Welcome,
  Bucket,
  Event,
  EventData,
  ProcessedAWEvent,
  ActivityWatchData,
  BucketMetadata,
  EventGroup,
} from '../activity-watch.d';

// Color palette for activity coloring (matching goal colors)
const ACTIVITY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-cyan-500',
];

// Special colors for specific categories
const SPECIAL_COLORS = {
  afk: 'bg-gray-400',
  idle: 'bg-gray-300',
};

// Configuration constants
export const DEFAULT_DAYS_BACK = 7;
export const DEFAULT_MIN_DURATION_SECONDS = 60;
export const DEFAULT_GROUP_GAP_MINUTES = 15;

export interface ProcessingOptions {
  daysBack?: number;
  minDurationSeconds?: number;
  clearExisting?: boolean;
}

/**
 * Parse ActivityWatch JSON file
 */
export async function parseActivityWatchJSON(file: File): Promise<Welcome> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate that it has the expected structure
        if (!parsed.buckets || typeof parsed.buckets !== 'object') {
          throw new Error('Invalid ActivityWatch export: missing buckets');
        }

        resolve(parsed as Welcome);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Filter events by date range
 */
export function filterEventsByDate(events: Event[], daysBack: number): Event[] {
  const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

  return events.filter((event) => {
    const timestamp = new Date(event.timestamp).getTime();
    return timestamp >= cutoffTime;
  });
}

/**
 * Filter events by minimum duration
 */
export function filterEventsByDuration(
  events: Event[],
  minSeconds: number
): Event[] {
  return events.filter((event) => event.duration >= minSeconds);
}

/**
 * Extract display name from event data based on bucket type
 */
export function getDisplayName(event: Event, bucketType: string): string {
  const { data } = event;

  switch (bucketType) {
    case 'window':
      // Prefer app name, fallback to title
      if (data.app) return data.app;
      if (data.title) return data.title;
      return 'Unknown Window';

    case 'editor':
      // Show editor and file/project
      const editor = data.editor || data.editorVersion || 'Editor';
      if (data.file) {
        // Extract filename from path
        const fileName = data.file.split('/').pop() || data.file;
        return `${editor}: ${fileName}`;
      }
      if (data.project) {
        return `${editor}: ${data.project}`;
      }
      if (data.language) {
        return `${editor} (${data.language})`;
      }
      return editor;

    case 'browser':
    case 'web':
      // Show page title or URL
      if (data.title) return data.title;
      if (data.url) {
        try {
          const url = new URL(data.url);
          return url.hostname;
        } catch {
          return data.url;
        }
      }
      return 'Browser';

    case 'afkstatus':
      // Show AFK status
      return data.status === 'afk' ? 'Away from Keyboard' : 'Active';

    default:
      // For unknown bucket types, try to extract something useful
      if (data.app) return data.app;
      if (data.title) return data.title;
      return bucketType.charAt(0).toUpperCase() + bucketType.slice(1);
  }
}

/**
 * Assign color to activity using deterministic hash
 */
export function assignColor(displayName: string, bucketType: string): string {
  // Special handling for AFK
  if (bucketType === 'afkstatus') {
    return SPECIAL_COLORS.afk;
  }

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = ((hash << 5) - hash) + displayName.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Map to color palette
  const index = Math.abs(hash) % ACTIVITY_COLORS.length;
  return ACTIVITY_COLORS[index];
}

/**
 * Generate unique ID for processed event
 */
function generateEventId(bucketId: string, timestamp: number): string {
  return `${bucketId}-${timestamp}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Process all buckets and events
 */
export function processAWEvents(
  welcomeData: Welcome,
  options: ProcessingOptions = {}
): ActivityWatchData {
  const { daysBack = DEFAULT_DAYS_BACK, minDurationSeconds = DEFAULT_MIN_DURATION_SECONDS } = options;

  const processedEvents: ProcessedAWEvent[] = [];
  const bucketsMetadata: BucketMetadata[] = [];

  // Process each bucket
  Object.entries(welcomeData.buckets).forEach(([bucketId, bucket]) => {
    if (!bucket.events || bucket.events.length === 0) {
      return; // Skip empty buckets
    }

    // Filter events
    let filteredEvents = filterEventsByDate(bucket.events, daysBack);
    filteredEvents = filterEventsByDuration(filteredEvents, minDurationSeconds);

    if (filteredEvents.length === 0) {
      return; // Skip if no events pass filters
    }

    // Calculate date range for this bucket
    const timestamps = filteredEvents.map(e => new Date(e.timestamp).getTime());
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    // Process each event
    filteredEvents.forEach((event) => {
      const timestamp = new Date(event.timestamp).getTime();
      const displayName = getDisplayName(event, bucket.type);
      const color = assignColor(displayName, bucket.type);

      const processedEvent: ProcessedAWEvent = {
        id: generateEventId(bucketId, timestamp),
        bucketId: bucket.id,
        bucketType: bucket.type,
        timestamp,
        duration: event.duration,
        displayName,
        eventData: event.data,
        color,
        isHidden: false,
      };

      processedEvents.push(processedEvent);
    });

    // Create bucket metadata
    const metadata: BucketMetadata = {
      id: bucket.id,
      type: bucket.type,
      eventCount: filteredEvents.length,
      dateRange: {
        start: minTimestamp,
        end: maxTimestamp,
      },
      isVisible: true, // All buckets visible by default
    };

    bucketsMetadata.push(metadata);
  });

  // Sort events by timestamp (oldest first)
  processedEvents.sort((a, b) => a.timestamp - b.timestamp);

  return {
    events: processedEvents,
    importedAt: Date.now(),
    buckets: bucketsMetadata,
  };
}

/**
 * Group adjacent events with the same display name
 * Reduces visual clutter for rapid app switching
 */
export function groupAdjacentEvents(
  events: ProcessedAWEvent[],
  maxGapMinutes: number = DEFAULT_GROUP_GAP_MINUTES
): EventGroup[] {
  if (events.length === 0) return [];

  const groups: EventGroup[] = [];
  const maxGapMs = maxGapMinutes * 60 * 1000;

  let currentGroup: EventGroup | null = null;

  events.forEach((event) => {
    const shouldStartNewGroup =
      !currentGroup ||
      currentGroup.displayName !== event.displayName ||
      event.timestamp - currentGroup.timeRange.end > maxGapMs;

    if (shouldStartNewGroup) {
      // Save previous group if exists
      if (currentGroup) {
        groups.push(currentGroup);
      }

      // Start new group
      currentGroup = {
        displayName: event.displayName,
        color: event.color,
        occurrences: [event],
        totalDuration: event.duration,
        timeRange: {
          start: event.timestamp,
          end: event.timestamp + (event.duration * 1000),
        },
        isExpanded: false,
      };
    } else if (currentGroup) {
      // Add to current group
      currentGroup.occurrences.push(event);
      currentGroup.totalDuration += event.duration;
      currentGroup.timeRange.end = event.timestamp + (event.duration * 1000);
    }
  });

  // Don't forget the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Get preview statistics for imported data
 */
export interface ImportPreview {
  bucketCount: number;
  totalEventCount: number;
  filteredEventCount: number;
  dateRange: string;
  bucketTypes: string[];
}

export function getImportPreview(
  welcomeData: Welcome,
  options: ProcessingOptions = {}
): ImportPreview {
  const { daysBack = DEFAULT_DAYS_BACK, minDurationSeconds = DEFAULT_MIN_DURATION_SECONDS } = options;

  const buckets = Object.values(welcomeData.buckets);
  const bucketTypes = Array.from(new Set(buckets.map(b => b.type)));

  let totalEventCount = 0;
  let filteredEventCount = 0;
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  buckets.forEach((bucket) => {
    if (!bucket.events) return;

    totalEventCount += bucket.events.length;

    // Filter and count
    let filtered = filterEventsByDate(bucket.events, daysBack);
    filtered = filterEventsByDuration(filtered, minDurationSeconds);
    filteredEventCount += filtered.length;

    // Track date range
    filtered.forEach((event) => {
      const timestamp = new Date(event.timestamp).getTime();
      minTimestamp = Math.min(minTimestamp, timestamp);
      maxTimestamp = Math.max(maxTimestamp, timestamp);
    });
  });

  // Format date range
  let dateRange = 'No events';
  if (filteredEventCount > 0) {
    const startDate = new Date(minTimestamp).toLocaleDateString();
    const endDate = new Date(maxTimestamp).toLocaleDateString();
    dateRange = `${startDate} - ${endDate}`;
  }

  return {
    bucketCount: buckets.length,
    totalEventCount,
    filteredEventCount,
    dateRange,
    bucketTypes,
  };
}

/**
 * Merge consecutive events with the same data
 * Useful for reducing redundant entries (e.g., same window stayed open)
 */
export function mergeConsecutiveDuplicates(events: ProcessedAWEvent[]): ProcessedAWEvent[] {
  if (events.length === 0) return [];

  const merged: ProcessedAWEvent[] = [];
  let current: ProcessedAWEvent = { ...events[0] };

  for (let i = 1; i < events.length; i++) {
    const event = events[i];

    // Check if this event is a duplicate of the current one
    const isSameActivity =
      event.displayName === current.displayName &&
      event.bucketId === current.bucketId;

    // Check if they're adjacent in time (no gap)
    const currentEnd = current.timestamp + (current.duration * 1000);
    const gap = event.timestamp - currentEnd;
    const isAdjacent = gap <= 1000; // Allow 1 second gap for rounding

    if (isSameActivity && isAdjacent) {
      // Merge by extending duration
      current.duration = current.duration + event.duration + (gap / 1000);
    } else {
      // Save current and start new
      merged.push(current);
      current = { ...event };
    }
  }

  // Don't forget the last one
  merged.push(current);

  return merged;
}
