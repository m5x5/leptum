import { useState, useEffect } from 'react';
import { ProcessedAWEvent } from '../../activity-watch.d';
import { ActivityWatchEntry, EventGroupEntry, TimeBlockEntry, GapBlock } from './TimelineEntry';
import { chunkEventsIntoTimeBlocks, mergeConsecutiveBlocks, isLoginWindowOnlyBlock, DEFAULT_BLOCK_SIZE_MINUTES } from '../../utils/timeBlocks';
import DraftTimelineEntry from './DraftTimelineEntry';
import { LiveActivityDuration } from './LiveActivityDuration';

interface Impact {
  activity: string;
  date: number;
  goalId?: string;
  [key: string]: any;
}

interface TimelineDayViewProps {
  dateKey: string;
  impacts: Impact[];
  goals: Array<{ id: string; name: string; color?: string }> | null;
  awEvents: ProcessedAWEvent[];
  filterSettings: {
    showManual: boolean;
    showActivityWatch: boolean;
  };
  onOpenEditModal: (impact: Impact, index: number) => void;
  onOpenAddModal: (data: { activity: string; date: string; time: string; goalId: string }) => void;
  onAWEventClick: (event: ProcessedAWEvent) => void;
  getActivityColor: (impact: Impact) => string;
}

export function TimelineDayView({
  dateKey,
  impacts,
  goals,
  awEvents: allAWEvents,
  filterSettings,
  onOpenEditModal,
  onOpenAddModal,
  onAWEventClick,
  getActivityColor,
}: TimelineDayViewProps) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [expandedBlockStart, setExpandedBlockStart] = useState<number | null>(null);
  const [editingGapStart, setEditingGapStart] = useState<number | null>(null);

  // Effect to close detail views when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setExpandedBlockStart(null);
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day).getTime();
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

  const isTodayFlag = (() => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month - 1 &&
      today.getDate() === day
    );
  })();

  // Filter impacts for this day
  const dayImpacts = impacts
    .filter(impact => {
      const impactDate = new Date(impact.date);
      return (
        impactDate.getFullYear() === year &&
        impactDate.getMonth() === month - 1 &&
        impactDate.getDate() === day
      );
    })
    .sort((a, b) => b.date - a.date); // Newest first

  // Separate AW events by type
  const awEvents = allAWEvents.filter(e => e.bucketType !== 'afkstatus');
  const afkEvents = allAWEvents.filter(e => e.bucketType === 'afkstatus');

  // Pre-calculate AFK status for 15-min blocks
  const afkMap = new Map<number, boolean>();
  const blockSize = 15 * 60 * 1000;

  if (afkEvents.length > 0) {
    afkEvents.forEach(event => {
      const isActive = event.displayName === 'Active' || event.eventData.status === 'not-afk';
      const eventStart = event.timestamp;
      const eventEnd = eventStart + (event.duration * 1000);

      const firstBlockStart = Math.floor(eventStart / blockSize) * blockSize;
      const lastBlockStart = Math.floor(eventEnd / blockSize) * blockSize;

      for (let blockStart = firstBlockStart; blockStart <= lastBlockStart; blockStart += blockSize) {
         const blockEnd = blockStart + blockSize;
         const overlapStart = Math.max(eventStart, blockStart);
         const overlapEnd = Math.min(eventEnd, blockEnd);
         if (overlapEnd > overlapStart) {
           const currentStatus = afkMap.get(blockStart);
           if (currentStatus === true || (currentStatus === undefined && isActive)) {
             afkMap.set(blockStart, isActive);
           }
         }
      }
    });
  }

  const checkPresence = (time: number) => {
     const blockStart = Math.floor(time / blockSize) * blockSize;
     return afkMap.get(blockStart) === true;
  };

  // Create time blocks
  let timeBlocks: any[] = [];
  if (awEvents.length > 0) {
    const chunks = chunkEventsIntoTimeBlocks(awEvents, DEFAULT_BLOCK_SIZE_MINUTES, dayStart, dayEnd);
    timeBlocks = mergeConsecutiveBlocks(chunks);
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDurationInMs = (startTime: number, endTime: number) => {
    return endTime - startTime;
  };

  const getLocalDateTimeStrings = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hours}:${minutes}`
    };
  };

  const roundToNearest15Minutes = (timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;

    date.setMinutes(roundedMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date.getTime();
  };

  const handleInlineSubmit = (formData: { activity: string; goalId: string }) => {
    if (!editingGapStart) return;

    const { dateStr, timeStr } = getLocalDateTimeStrings(editingGapStart);

    onOpenAddModal({
      activity: formData.activity,
      date: dateStr,
      time: timeStr,
      goalId: formData.goalId,
    });

    setEditingGapStart(null);
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Manual Activities */}
      {filterSettings.showManual && (
        <div className="relative pl-8" style={{ minHeight: '200px' }}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Manual Activities</h3>

          {dayImpacts.map((impact, index) => {
            const isFirstItem = index === 0;
            const isLive = isTodayFlag && isFirstItem;

            let duration = null;
            let endTime: number;
            let durationMs: number;

            if (isFirstItem && !isTodayFlag) {
              const dayEndDate = new Date(impact.date);
              dayEndDate.setHours(24, 0, 0, 0);
              endTime = dayEndDate.getTime();
              duration = getDuration(impact.date, endTime);
              durationMs = getDurationInMs(impact.date, endTime);
            } else if (!isFirstItem) {
              const nextActivity = dayImpacts[index - 1];
              endTime = nextActivity.date;
              duration = getDuration(impact.date, endTime);
              durationMs = getDurationInMs(impact.date, endTime);
            } else {
              durationMs = now - impact.date;
              endTime = now;
            }

            const durationMinutes = durationMs / (1000 * 60);
            const barHeight = Math.max(12, durationMinutes * 2);
            const isShortActivity = durationMinutes < 15;
            const isLongActivity = durationMinutes >= 60;

            const actualIndex = impacts.findIndex(
              (imp) => imp.date === impact.date && imp.activity === impact.activity
            );

            return (
               <div
                 key={`manual-${impact.date}-${index}`}
                 className="relative flex items-start group/manual-entry"
               >
                <div
                  className={`absolute left-[-1.45rem] w-1 ${getActivityColor(
                    impact
                  )} ${isLive ? 'animate-pulse' : ''}`}
                  style={{ height: `${barHeight}px` }}
                ></div>

                {/* Sub-slots for adding activities */}
                {durationMs >= 20 * 60 * 1000 && (
                  <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none group-hover/manual-entry:pointer-events-auto z-10 hidden group-hover/manual-entry:block">
                    {(() => {
                      const slots: JSX.Element[] = [];
                      const slotSize = 15 * 60 * 1000;
                      const effectiveEndTime = isLive ? Date.now() : endTime;
                      let currentSlotTime = effectiveEndTime - slotSize;

                      while (currentSlotTime > impact.date + (5 * 60 * 1000)) {
                          const timeFromEnd = effectiveEndTime - currentSlotTime;
                          const slotTop = (timeFromEnd / (1000 * 60)) * 2;
                          const thisSlotTime = currentSlotTime;

                          slots.push(
                              <div
                                  key={`slot-${thisSlotTime}`}
                                  className="absolute left-[-3.5rem] w-12 h-5 flex items-center justify-end opacity-0 hover:opacity-100 cursor-pointer group/slot"
                                  style={{ top: `${slotTop - 10}px` }}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const { dateStr, timeStr } = getLocalDateTimeStrings(thisSlotTime);
                                      onOpenAddModal({
                                          activity: "",
                                          date: dateStr,
                                          time: timeStr,
                                          goalId: "",
                                      });
                                  }}
                                  title={`Insert activity at ${formatTime(thisSlotTime)}`}
                              >
                                  <span className="text-[10px] font-mono text-muted-foreground mr-1 bg-background px-1 rounded shadow-sm">
                                    {formatTime(thisSlotTime)}
                                  </span>
                                  <div className="w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground shrink-0 z-10">
                                      <span className="text-[10px] font-bold">+</span>
                                  </div>
                                  <div className="absolute right-[-2rem] w-[2rem] h-px bg-primary/30 pointer-events-none" />
                              </div>
                          );
                          currentSlotTime -= slotSize;
                      }
                      return slots;
                    })()}
                </div>
                )}

                <div
                  className={`bg-card border-b hover:shadow-md transition-shadow cursor-pointer flex-1 min-w-0 ${
                    isLive ? 'border-b-primary border-b-2' : 'border-b-border'
                  } ${isShortActivity ? 'pb-2' : 'pb-3'}`}
                  style={{ minHeight: `${barHeight}px` }}
                  onClick={() => onOpenEditModal(impact, actualIndex)}
                >
                  <div className={`flex items-center justify-between pr-2 rounded py-1 -my-1 ${isLongActivity ? 'sticky top-[7.7rem] z-10 bg-card' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`text-sm font-mono whitespace-nowrap shrink-0 ${isLive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {formatTime(impact.date)}
                      </span>
                      <h3 className={`text-base font-semibold truncate ${isLive ? 'text-primary' : 'text-foreground'}`}>
                        {impact.activity}
                      </h3>
                      {isLive && <span className="text-xs text-primary whitespace-nowrap shrink-0">(Live)</span>}
                    </div>
                    {isLive ? (
                      <LiveActivityDuration
                        startTime={impact.date}
                        formatDuration={getDuration}
                      />
                    ) : duration && (
                      <span className="text-sm px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                        {duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Gap blocks for morning (before first activity) */}
          {(() => {
            let current: number;

            if (dayImpacts.length > 0) {
              current = dayImpacts[dayImpacts.length - 1].date;
            } else {
              current = isTodayFlag ? now : dayEnd;
            }

            const gapCeiling = current;
            const gaps: JSX.Element[] = [];

            while (current > dayStart) {
              const chunkStart = Math.max(dayStart, current - (15 * 60 * 1000));
              const chunkEnd = current;

              if (chunkEnd > chunkStart) {
                const isOccludedByDraft = editingGapStart !== null &&
                                         chunkStart > editingGapStart &&
                                         chunkStart < gapCeiling;

                if (isOccludedByDraft) {
                  // Skip
                }
                else if (editingGapStart === chunkStart) {
                  gaps.push(
                    <DraftTimelineEntry
                      key={`draft-${chunkStart}`}
                      startTime={chunkStart}
                      endTime={gapCeiling}
                      formatTime={formatTime}
                      onCancel={() => setEditingGapStart(null)}
                      onSubmit={handleInlineSubmit}
                    />
                  );
                } else {
                  gaps.push(
                    <GapBlock
                      key={`gap-morning-${chunkStart}`}
                      startTime={chunkStart}
                      endTime={chunkEnd}
                      formatTime={formatTime}
                      onClick={(e) => {
                        e?.stopPropagation();
                        setEditingGapStart(chunkStart);
                      }}
                    />
                  );
                }
              }

              current = chunkStart;
            }

            return gaps;
          })()}
          </div>
        )}

      {/* ActivityWatch Events */}
      {filterSettings.showActivityWatch && timeBlocks.length > 0 && (
        <div className="relative pl-8" style={{ minHeight: '200px' }}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">
            ActivityWatch Events
            <span className="ml-2 text-xs font-normal">
              {timeBlocks.length} blocks • {awEvents.length} events
            </span>
          </h3>

          {(() => {
            const sortedBlocks = [...timeBlocks].sort((a, b) => b.startTime - a.startTime);

            if (sortedBlocks.length === 0) {
              const dayTop = isTodayFlag ? Math.min(roundToNearest15Minutes(now), dayEnd) : dayEnd;
              const gaps: JSX.Element[] = [];
              let current = dayTop;
              while (current > dayStart) {
                const chunkStart = Math.max(dayStart, current - (15 * 60 * 1000));
                const chunkEnd = current;
                gaps.push(
                  <GapBlock
                    key={`gap-empty-${chunkStart}`}
                    startTime={chunkStart}
                    endTime={chunkEnd}
                    formatTime={formatTime}
                    isPresenceActive={checkPresence}
                  />
                );
                current = chunkStart;
              }
              return gaps;
            }

            const blockElements = sortedBlocks.map((block, idx) => {
                const gapElements: JSX.Element[] = [];

                if (idx === 0) {
                  const dayTop = isTodayFlag ? Math.min(roundToNearest15Minutes(Date.now()), dayEnd) : dayEnd;
                  const gapTop = dayTop;
                  const gapBottom = Math.min(block.endTime, dayEnd);

                  let current = gapTop;
                  while (current > gapBottom) {
                    const chunkStart = Math.max(gapBottom, current - (15 * 60 * 1000));
                    const chunkEnd = current;

                    gapElements.push(
                      <GapBlock
                        key={`gap-top-${chunkStart}`}
                        startTime={chunkStart}
                        endTime={chunkEnd}
                        formatTime={formatTime}
                        isPresenceActive={checkPresence}
                      />
                    );
                    current = chunkStart;
                  }
                } else {
                  const prevBlock = sortedBlocks[idx - 1];
                  const gapStartTime = Math.min(prevBlock.startTime, dayEnd);
                  const gapEndTime = Math.min(block.endTime, dayEnd);

                  let current = gapStartTime;
                  while (current > gapEndTime) {
                    const chunkStart = Math.max(gapEndTime, current - (15 * 60 * 1000));
                    const chunkEnd = current;

                    gapElements.push(
                      <GapBlock
                        key={`gap-between-${chunkStart}`}
                        startTime={chunkStart}
                        endTime={chunkEnd}
                        formatTime={formatTime}
                        isPresenceActive={checkPresence}
                      />
                    );

                    current = chunkStart;
                  }
                }

                const isInactive = isLoginWindowOnlyBlock(block);

                return (
                  <div
                    key={`block-wrapper-${block.startTime}-${idx}`}
                    style={{ marginBottom: '0px' }}
                  >
                    {gapElements}

                    <div>
                      {isInactive ? (
                        (() => {
                          const inactiveGaps: JSX.Element[] = [];
                          let current = block.endTime;
                          while (current > block.startTime) {
                            const chunkStart = Math.max(block.startTime, current - (15 * 60 * 1000));
                            const chunkEnd = current;

                            inactiveGaps.push(
                              <GapBlock
                                key={`gap-inactive-${chunkStart}`}
                                startTime={chunkStart}
                                endTime={chunkEnd}
                                formatTime={formatTime}
                                isPresenceActive={checkPresence}
                              />
                            );
                            current = chunkStart;
                          }
                          return <>{inactiveGaps}</>;
                        })()
                      ) : (
                        <TimeBlockEntry
                          block={block}
                          formatTime={formatTime}
                          formatDuration={formatDuration}
                          onEventClick={onAWEventClick}
                          isExpanded={expandedBlockStart === block.startTime}
                          onToggleExpand={() => {
                              setExpandedBlockStart(
                                  expandedBlockStart === block.startTime ? null : block.startTime
                              );
                          }}
                          isPresenceActive={checkPresence}
                        />
                      )}
                    </div>
                  </div>
                );
            });

            // Bottom gaps
            const oldestBlockStartTime = sortedBlocks[sortedBlocks.length - 1].startTime;
            const bottomGaps: JSX.Element[] = [];
            let current = oldestBlockStartTime;
            while (current > dayStart) {
              const chunkStart = Math.max(dayStart, current - (15 * 60 * 1000));
              const chunkEnd = current;
              bottomGaps.push(
                <GapBlock
                  key={`gap-bottom-${chunkStart}`}
                  startTime={chunkStart}
                  endTime={chunkEnd}
                  formatTime={formatTime}
                  isPresenceActive={checkPresence}
                />
              );
              current = chunkStart;
            }

            return [...blockElements, ...bottomGaps];
            })()}
        </div>
      )}
    </div>
  );
}
