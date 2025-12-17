import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import {
  ActivityWatchData,
  ProcessedAWEvent,
  BucketMetadata,
  Welcome,
} from '../activity-watch.d';
import {
  processAWEvents,
  filterDuplicateEvents,
  ProcessingOptions,
  DEFAULT_DAYS_BACK,
  DEFAULT_MIN_DURATION_SECONDS,
} from './activityWatch';

export interface FilterSettings {
  showManual: boolean;
  showActivityWatch: boolean;
  minDuration: number;
  visibleBuckets: string[]; // Bucket IDs to show
  daysBack: number;
}

export interface UseActivityWatchReturn {
  awData: ActivityWatchData | null;
  isLoading: boolean;
  error: string | null;
  filterSettings: FilterSettings;
  importData: (file: File, options?: ProcessingOptions) => Promise<void>;
  clearData: () => Promise<void>;
  toggleBucket: (bucketId: string) => Promise<void>;
  updateFilterSettings: (updates: Partial<FilterSettings>) => void;
  reload: () => Promise<void>;
  duplicateCount: number;
}

const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  showManual: true,
  showActivityWatch: true,
  minDuration: DEFAULT_MIN_DURATION_SECONDS,
  visibleBuckets: [],
  daysBack: DEFAULT_DAYS_BACK,
};

export function useActivityWatch(): UseActivityWatchReturn {
  const [awData, setAwData] = useState<ActivityWatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [duplicateCount, setDuplicateCount] = useState(0);

  /**
   * Load ActivityWatch data from RemoteStorage
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await remoteStorageClient.getActivityWatchData();

      if (data) {
        const { uniqueEvents, duplicateCount: removedCount } = filterDuplicateEvents(data.events);
        setDuplicateCount(removedCount);
        
        setAwData({ ...data, events: uniqueEvents });

        // Initialize filter settings with buckets that are marked as visible
        setFilterSettings((prev) => ({
          ...prev,
          visibleBuckets: data.buckets
            .filter((b: BucketMetadata) => b.isVisible !== false) // Include if isVisible is true or undefined
            .map((b: BucketMetadata) => b.id),
        }));
      } else {
        setAwData(null);
      }
    } catch (err) {
      console.error('Failed to load ActivityWatch data:', err);
      setError('Failed to load ActivityWatch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Import new ActivityWatch data from JSON file
   */
  const importData = useCallback(
    async (file: File, options: ProcessingOptions = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid circular dependencies
        const { parseActivityWatchJSON } = await import('./activityWatch');

        // Parse the JSON file
        const welcomeData: Welcome = await parseActivityWatchJSON(file);

        // Process the events
        const processedData = processAWEvents(welcomeData, options);

        // If clearExisting is true, replace; otherwise merge
        // Filter duplicates from processed data
        const { uniqueEvents, duplicateCount: newDuplicates } = filterDuplicateEvents(processedData.events);
        
        let finalData: ActivityWatchData;
        if (options.clearExisting || !awData) {
          // Replace entirely
          finalData = { ...processedData, events: uniqueEvents };
          setDuplicateCount(newDuplicates);
          await remoteStorageClient.saveActivityWatchData(finalData);
          setAwData(finalData);
        } else {
          // Merge with existing data
          const mergedEvents = [...awData.events, ...uniqueEvents].sort(
            (a, b) => a.timestamp - b.timestamp
          );
          
          // Re-filter specifically for safety if overlaps occurred during merge
          const { uniqueEvents: finalEvents, duplicateCount: totalDuplicates } = filterDuplicateEvents(mergedEvents);
          setDuplicateCount(totalDuplicates);

          finalData = {
            events: finalEvents,
            importedAt: Date.now(),
            buckets: mergeBuckets(awData.buckets, processedData.buckets),
          };

          await remoteStorageClient.saveActivityWatchData(finalData);
          setAwData(finalData);
        }

        // Update filter settings to show all buckets from the final data
        setFilterSettings((prev) => ({
          ...prev,
          visibleBuckets: finalData.buckets.map((b) => b.id),
        }));
      } catch (err: any) {
        console.error('Failed to import ActivityWatch data:', err);
        setError(err.message || 'Failed to import ActivityWatch data');
        throw err; // Re-throw so caller can handle
      } finally {
        setIsLoading(false);
      }
    },
    [awData]
  );

  /**
   * Clear all ActivityWatch data
   */
  const clearData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await remoteStorageClient.clearActivityWatchData();
      setAwData(null);
      setFilterSettings(DEFAULT_FILTER_SETTINGS);
    } catch (err) {
      console.error('Failed to clear ActivityWatch data:', err);
      setError('Failed to clear ActivityWatch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle visibility of a specific bucket
   */
  const toggleBucket = useCallback(
    async (bucketId: string) => {
      if (!awData) return;

      try {
        // Update local filter settings
        setFilterSettings((prev) => {
          const isCurrentlyVisible = prev.visibleBuckets.includes(bucketId);

          return {
            ...prev,
            visibleBuckets: isCurrentlyVisible
              ? prev.visibleBuckets.filter((id) => id !== bucketId)
              : [...prev.visibleBuckets, bucketId],
          };
        });

        // Update bucket metadata in RemoteStorage
        const updatedBuckets = awData.buckets.map((bucket) =>
          bucket.id === bucketId
            ? { ...bucket, isVisible: !bucket.isVisible }
            : bucket
        );

        const updatedData: ActivityWatchData = {
          ...awData,
          buckets: updatedBuckets,
        };

        await remoteStorageClient.saveActivityWatchData(updatedData);
        setAwData(updatedData);
      } catch (err) {
        console.error('Failed to toggle bucket:', err);
        setError('Failed to toggle bucket visibility');
      }
    },
    [awData]
  );

  /**
   * Update filter settings
   */
  const updateFilterSettings = useCallback((updates: Partial<FilterSettings>) => {
    setFilterSettings((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Reload data from RemoteStorage
   */
  const reload = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    awData,
    isLoading,
    error,
    filterSettings,
    importData,
    clearData,
    toggleBucket,
    updateFilterSettings,
    reload,
    duplicateCount,
  };
}

/**
 * Helper: Merge bucket metadata arrays
 */
function mergeBuckets(
  existing: BucketMetadata[],
  newBuckets: BucketMetadata[]
): BucketMetadata[] {
  const merged = [...existing];

  newBuckets.forEach((newBucket) => {
    const existingIndex = merged.findIndex((b) => b.id === newBucket.id);

    if (existingIndex >= 0) {
      // Update existing bucket
      merged[existingIndex] = {
        ...merged[existingIndex],
        eventCount: merged[existingIndex].eventCount + newBucket.eventCount,
        dateRange: {
          start: Math.min(merged[existingIndex].dateRange.start, newBucket.dateRange.start),
          end: Math.max(merged[existingIndex].dateRange.end, newBucket.dateRange.end),
        },
      };
    } else {
      // Add new bucket
      merged.push(newBucket);
    }
  });

  return merged;
}
