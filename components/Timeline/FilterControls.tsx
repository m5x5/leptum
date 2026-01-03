import { useState, useEffect } from 'react';
import { FilterSettings } from '../../utils/useActivityWatch';
import { BucketMetadata } from '../../activity-watch.d';
import { FilterIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';

interface FilterControlsProps {
  filterSettings: FilterSettings;
  buckets: BucketMetadata[];
  onUpdateFilters: (updates: Partial<FilterSettings>) => void;
  onToggleBucket?: (bucketId: string) => void;
  totalActiveTime?: number;
  formatDuration?: (ms: number) => string;
}

export default function FilterControls({
  filterSettings,
  buckets,
  onUpdateFilters,
  onToggleBucket,
  totalActiveTime,
  formatDuration,
}: FilterControlsProps) {
  const {
    showManual,
    showActivityWatch,
    minDuration,
    visibleBuckets,
  } = filterSettings;

  // Collapsed by default on mobile, expanded on desktop
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Check screen size on mount and set initial state
  useEffect(() => {
    const checkScreenSize = () => {
      // Expand by default on md screens and larger (768px+)
      setIsCollapsed(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div
        className="flex items-center justify-between cursor-pointer md:cursor-default"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 md:gap-4">
          <FilterIcon className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Filters</h3>

          {/* Time Tracking Pill - Desktop Only */}
          {totalActiveTime !== undefined && formatDuration && totalActiveTime > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md border border-green-500/20">
              <span className="text-sm font-medium">Online Presence: {formatDuration(totalActiveTime)}</span>
            </div>
          )}
        </div>
        <button
          className="md:hidden p-1 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
        >
          {isCollapsed ? (
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {/* Source Toggles */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                Show Data From
              </label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showManual}
                    onChange={(e) =>
                      onUpdateFilters({ showManual: e.target.checked })
                    }
                    className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-foreground">
                    Manual Activities
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showActivityWatch}
                    onChange={(e) =>
                      onUpdateFilters({ showActivityWatch: e.target.checked })
                    }
                    className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-foreground">
                    ActivityWatch Events
                  </span>
                </label>
              </div>
            </div>

            {/* Bucket Type Filter */}
            {buckets.length > 0 && showActivityWatch && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  ActivityWatch Buckets
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {buckets.map((bucket) => {
                    const isVisible = visibleBuckets.includes(bucket.id);
                    return (
                      <label
                        key={bucket.id}
                        className="flex items-center cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            if (onToggleBucket) {
                              onToggleBucket(bucket.id);
                            }
                          }}
                          className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-foreground flex items-center gap-2">
                          {bucket.type}
                          <span className="text-xs text-muted-foreground">
                            ({bucket.eventCount})
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Duration Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                Minimum Duration
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="30"
                  value={minDuration}
                  onChange={(e) =>
                    onUpdateFilters({ minDuration: parseInt(e.target.value) })
                  }
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm text-foreground w-16 text-right">
                  {minDuration}s
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hide events shorter than this duration
              </p>
            </div>
          </div>

          {/* Stats */}
          {buckets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Buckets</p>
                  <p className="text-lg font-semibold text-foreground">
                    {buckets.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visible Buckets</p>
                  <p className="text-lg font-semibold text-foreground">
                    {visibleBuckets.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                  <p className="text-lg font-semibold text-foreground">
                    {buckets.reduce((sum, b) => sum + b.eventCount, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bucket Types</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Set(buckets.map((b) => b.type)).size}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
