import Head from "next/head";
import { useState, useMemo, useEffect } from "react";
import GoalList from "../components/Goals/List";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { useWeeklyGoals, WeeklyGoalItem } from "../utils/useWeeklyGoals";
import { useWeeklyGoalTimeTracking } from "../utils/useWeeklyGoalTimeTracking";
import { WeeklyGoalTimeTracking } from "../components/WeeklyGoals/TimeTracking";
import { DayCard } from "../components/WeeklyGoals/DayCard";
import { AddWeeklyGoalModal } from "../components/Modal/AddWeeklyGoalModal";
import { MigrationBanner } from "../components/WeeklyGoals/MigrationBanner";
import { DayTimelineSlideOver } from "../components/WeeklyGoals/DayTimelineSlideOver";
import { getDayOfWeek, Impact } from "../utils/timeCalculations";
import { remoteStorageClient } from "../lib/remoteStorage";
import { useActivityWatch } from "../utils/useActivityWatch";
import { ProcessedAWEvent } from "../activity-watch.d";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from "@heroicons/react/solid";

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'weekly'>('general');
  const { goals, isError } = useGoals();
  const { goalTypes, isError: isErrorGoalTypes, addGoalType } = useGoalTypes();

  const {
    weeklyGoal,
    currentWeekStart,
    isLoading: weeklyLoading,
    isError: weeklyError,
    addGoal,
    removeGoal,
    updateGoal,
    navigateWeek,
    goToCurrentWeek
  } = useWeeklyGoals();

  const [editingGoal, setEditingGoal] = useState<{ day: string; index: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [addGoalModalOpen, setAddGoalModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<typeof DAYS[number]['key'] | null>(null);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [timelineSlideOverOpen, setTimelineSlideOverOpen] = useState(false);
  const [selectedDayForTimeline, setSelectedDayForTimeline] = useState<typeof DAYS[number]['key'] | null>(null);

  const { goalTimeBreakdowns } = useWeeklyGoalTimeTracking(currentWeekStart, goals);

  // Load ActivityWatch data
  const {
    awData,
    filterSettings,
  } = useActivityWatch();

  // Get AW events for a specific date
  const getFilteredAWEventsForDate = (dateKey: string): ProcessedAWEvent[] => {
    if (!awData || !awData.events || awData.events.length === 0) return [];

    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    const filtered = awData.events.filter(event => {
      // Date range filter
      if (event.timestamp < dayStart || event.timestamp > dayEnd) return false;

      // Apply the same filters as timeline page
      if (filterSettings.showActivityWatch) {
        // Filter by visible buckets
        if (!filterSettings.visibleBuckets.includes(event.bucketId)) return false;

        // Filter by minimum duration
        if (event.duration < filterSettings.minDuration) return false;
      }

      return true;
    });

    return filtered;
  };

  // Load impacts for activity bars
  useEffect(() => {
    const loadImpacts = async () => {
      try {
        const data = await remoteStorageClient.getImpacts();
        setImpacts(data || []);
      } catch (error) {
        console.error("Failed to load impacts:", error);
      }
    };

    loadImpacts();
  }, []);

  const handleSaveImpacts = async (newImpacts: Impact[]) => {
    try {
      await remoteStorageClient.saveImpacts(newImpacts);
      setImpacts(newImpacts);
    } catch (error) {
      console.error("Failed to save impacts:", error);
    }
  };

  const handleEditDay = (dayKey: typeof DAYS[number]['key']) => {
    setSelectedDayForTimeline(dayKey);
    setTimelineSlideOverOpen(true);
  };

  const handleRemove = (name: string) => {};

  const handleAddGoalType = () => {
    const name = prompt("What is the name of the goal category?");
    if (!name) return;

    const description = prompt("Optional: Add a description for this category") || "";
    addGoalType(name, description);
  };

  if (isError) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goals) return <div>loading...</div>;
  if (isErrorGoalTypes) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goalTypes) return <div>loading...</div>;

  const formatWeekDisplay = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const monday = new Date(currentWeekStart);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return today >= monday && today <= sunday;
  };

  const handleAddGoal = (day: typeof DAYS[number]['key']) => {
    setSelectedDay(day);
    setAddGoalModalOpen(true);
  };

  const handleAddGoalItem = (goalItem: WeeklyGoalItem) => {
    if (!selectedDay) return;
    addGoal(selectedDay, goalItem);
    setSelectedDay(null);
  };

  const handleMigrateWeeklyGoal = async (migratedWeeklyGoal: any) => {
    try {
      await remoteStorageClient.saveWeeklyGoal(migratedWeeklyGoal);
      window.location.reload();
    } catch (error) {
      console.error('Failed to migrate weekly goal:', error);
      alert('Failed to migrate weekly goal');
    }
  };

  const getDayTimeBreakdown = (day: typeof DAYS[number]['key']) => {
    const breakdown: { [goalId: string]: number } = {};
    goalTimeBreakdowns.forEach(gtb => {
      const minutes = gtb.dailyBreakdown[day];
      if (minutes > 0) {
        breakdown[gtb.goalId] = minutes;
      }
    });
    return breakdown;
  };

  const getCurrentGoalIds = (day: typeof DAYS[number]['key']) => {
    if (!weeklyGoal) return [];
    return weeklyGoal.goals[day]
      .filter((item): item is WeeklyGoalItem => typeof item !== 'string')
      .map(item => item.goalId);
  };

  const handleEditGoal = (day: typeof DAYS[number]['key'], index: number, currentText: string) => {
    setEditingGoal({ day, index });
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (!editingGoal || !editText.trim()) return;
    updateGoal(editingGoal.day as any, editingGoal.index, editText);
    setEditingGoal(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setEditText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Calculate date key for each day of the week
  const getDayDateKey = (dayKey: typeof DAYS[number]['key']): string => {
    const weekStart = new Date(currentWeekStart);
    const dayIndex = DAYS.findIndex(d => d.key === dayKey);
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + dayIndex);

    const year = dayDate.getFullYear();
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <>
      <Head>
        <title>Goals - Leptum</title>
      </Head>
      <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your objectives and organize them by category
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-1 border-b-2 transition ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            General Goals
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`pb-3 px-1 border-b-2 transition ${
              activeTab === 'weekly'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly Goals
          </button>
        </div>
      </div>

      {/* General Goals Tab */}
      {activeTab === 'general' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleAddGoalType}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Goal Category</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {goalTypes.map((goalType) => (
              <GoalList
                name={goalType.name}
                stored={true}
                key={goalType.id}
                id={goalType.id}
                remove={handleRemove}
                items={goals.filter((goal) => goal.type === goalType.id)}
              />
            ))}
            {goalTypes.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No goal categories yet. Click "Add Goal Category" to create one.
              </div>
            )}
          </div>
        </>
      )}

      {/* Weekly Goals Tab */}
      {activeTab === 'weekly' && (
        <>
          {weeklyError && <div>Failed to load weekly goals. Press F5 to retry.</div>}
          {weeklyLoading && <div>loading weekly goals...</div>}
          {!weeklyLoading && !weeklyError && weeklyGoal && (
            <>
              {/* Migration Banner */}
              <MigrationBanner
                weeklyGoal={weeklyGoal}
                availableGoals={goals}
                onMigrate={handleMigrateWeeklyGoal}
              />

              {/* Week Navigation */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="p-2 text-muted-foreground hover:text-primary transition cursor-pointer"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[240px]">
                      <div className="text-sm text-foreground">{formatWeekDisplay(currentWeekStart)}</div>
                      {!isCurrentWeek() && (
                        <button
                          onClick={goToCurrentWeek}
                          className="text-xs text-primary hover:underline cursor-pointer"
                        >
                          Go to current week
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => navigateWeek('next')}
                      className="p-2 text-muted-foreground hover:text-primary transition cursor-pointer"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekly Time Summary */}
              <WeeklyGoalTimeTracking
                weekStart={currentWeekStart}
                weeklyGoal={weeklyGoal}
                goals={goals}
              />

              {/* Day Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {DAYS.map(({ key, label }) => (
                  <DayCard
                    key={key}
                    day={key}
                    dayLabel={label}
                    goalItems={weeklyGoal.goals[key]}
                    availableGoals={goals}
                    timeBreakdown={getDayTimeBreakdown(key)}
                    onAddGoal={() => handleAddGoal(key)}
                    onRemoveGoal={(index) => removeGoal(key, index)}
                    dateKey={getDayDateKey(key)}
                    impacts={impacts}
                    onEditDay={() => handleEditDay(key)}
                  />
                ))}
              </div>

              {/* Day Timeline Slide-Over */}
              {selectedDayForTimeline && (
                <DayTimelineSlideOver
                  isOpen={timelineSlideOverOpen}
                  onClose={() => {
                    setTimelineSlideOverOpen(false);
                    setSelectedDayForTimeline(null);
                  }}
                  dateKey={getDayDateKey(selectedDayForTimeline)}
                  dayLabel={DAYS.find(d => d.key === selectedDayForTimeline)?.label || ''}
                  impacts={impacts}
                  goals={goals}
                  onSaveImpacts={handleSaveImpacts}
                  awEvents={getFilteredAWEventsForDate(getDayDateKey(selectedDayForTimeline))}
                  filterSettings={filterSettings}
                />
              )}

              {/* Add Goal Modal */}
              <AddWeeklyGoalModal
                isOpen={addGoalModalOpen}
                onClose={() => {
                  setAddGoalModalOpen(false);
                  setSelectedDay(null);
                }}
                onAdd={handleAddGoalItem}
                availableGoals={goals}
                goalTypes={goalTypes}
                currentGoalIds={selectedDay ? getCurrentGoalIds(selectedDay) : []}
              />
            </>
          )}
        </>
      )}
      </div>
    </>
  );
}
