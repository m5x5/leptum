"use client";

import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  PencilIcon,
  PlayIcon,
  DotsVerticalIcon,
  FireIcon,
  StarIcon,
} from "@heroicons/react/solid";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { fetchCompletions } from '../../lib/query/collections';
import { LocationTrigger, Routine } from "../../components/Job/api";
import LocationTriggerInput from "../../components/LocationTriggerInput";
import Modal from "../../components/Modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../../components/ui/sheet";
import Select, {
  components as selectComponents,
  type DropdownIndicatorProps,
  type ClearIndicatorProps,
  type MultiValueRemoveProps,
} from "react-select";
import { ChevronDownIcon, XIcon } from "@heroicons/react/solid";
import { MenuIcon } from "@heroicons/react/outline";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getDescription } from "../../utils/cron";
import { cronToRRule, rruleToCron } from "../../lib/solidRdf/cronToRrule";
import { useTimeFormat } from "../../utils/useTimeFormat";
import { RoutineCompletion, useRoutineCompletions } from "../../utils/useRoutineCompletions";
import RoutineHeatmap from "../../components/RoutineHeatmap";
import { Goal, useGoals } from "../../utils/useGoals";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { GoalTrackingWidget } from "../../components/Goals/GoalTrackingWidget";
import { RichTextEditor } from "../../components/ui/rich-text-editor";
import { StreakInfo } from "../../utils/streakUtils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { StandaloneTask } from "../../lib/remoteStorage";

// Module-level cache — persists across navigations within the same session.
// On remount the component renders immediately with stale data, then the async
// fetch updates it in the background (stale-while-revalidate).
let cachedRoutines: Routine[] | null = null;

// ---- RoutineCard (memoized — modal state changes in parent don't re-render cards) ----

interface RoutineCardProps {
  routine: Routine;
  routineCompletions: RoutineCompletion[];
  goals: Goal[];
  getStreaksForRoutine: (id: string) => StreakInfo;
  onDelete: (routine: Routine) => void;
  onEdit: (routine: Routine) => void;
  onPlay?: (routine: Routine) => void;
}

const RoutineCard = memo(function RoutineCard({
  routine,
  routineCompletions,
  goals,
  getStreaksForRoutine,
  onDelete,
  onEdit,
  onPlay,
}: RoutineCardProps) {
  const linkedGoal =
    routine.goalIds && routine.goalIds.length > 0
      ? goals.find((g) => routine.goalIds?.includes(g.id) && g.templateId && g.trackingConfig)
      : undefined;
  const streakInfo = getStreaksForRoutine(routine.id);
  const checklistLinked = linkedGoal?.trackingConfig?.type === "checklist";
  const { use24Hour } = useTimeFormat();

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="text-base font-semibold leading-tight text-foreground line-clamp-2 break-words">{routine.name}</h3>
        {streakInfo.currentStreak > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-chip border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
            <FireIcon className="h-3.5 w-3.5 shrink-0 text-orange-500" />
            {streakInfo.currentStreak}d
          </span>
        )}
      </div>
      {routine.cron && (
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{getDescription(routine.cron, { use24Hour })}</p>
      )}
    </div>
  );

  const headerActions = (
    <>
      {(routine.tasks?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircleIcon className="h-4 w-4" />
          {routine.tasks.length}
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="More options">
            <DotsVerticalIcon className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(routine)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(routine)} className="text-destructive focus:text-destructive">
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
          {routine.locationTrigger && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                📍 {routine.locationTrigger.label || `${routine.locationTrigger.lat.toFixed(4)}, ${routine.locationTrigger.lon.toFixed(4)}`}
                {" · "}
                {routine.locationTrigger.radius}m radius
              </DropdownMenuLabel>
            </>
          )}
          {streakInfo.longestStreak > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <StarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Best streak: {streakInfo.longestStreak} day{streakInfo.longestStreak !== 1 ? "s" : ""}
              </DropdownMenuLabel>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <div className="relative flex min-w-72 flex-1 flex-col gap-4 rounded-card border border-border bg-card px-5 py-5">
      {checklistLinked && linkedGoal ? (
        <GoalTrackingWidget
          goal={linkedGoal}
          onUpdate={() => window.dispatchEvent(new CustomEvent("goalUpdated"))}
          embedded={true}
          routineName={routine.name}
          showHistory={false}
          showQuickAdd={false}
          routineCardHeader={titleBlock}
          routineCardActions={headerActions}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {onPlay && !routine.cron && !routine.locationTrigger && (
                <button
                  type="button"
                  onClick={() => onPlay(routine)}
                  className="inline-flex shrink-0 items-center justify-center bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Trigger routine"
                >
                  <PlayIcon className="h-6 w-6" />
                </button>
              )}
              {titleBlock}
            </div>
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          </div>
          {linkedGoal && (
            <GoalTrackingWidget
              goal={linkedGoal}
              onUpdate={() => window.dispatchEvent(new CustomEvent("goalUpdated"))}
              embedded={true}
              routineName={routine.name}
              showHistory={false}
              showQuickAdd={false}
            />
          )}
        </>
      )}
      {routineCompletions.length > 0 && <RoutineHeatmap completions={routineCompletions} compact />}
    </div>
  );
});

// ---- SortableTaskRow ----

interface SortableTaskRowProps {
  id: string;
  name: string;
  onRemove: () => void;
}

function SortableTaskRow({ id, name, onRemove }: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <MenuIcon className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm text-foreground">{name}</span>
      <Button
        type="button"
        variant="ghost-destructive"
        size="icon"
        onClick={onRemove}
        aria-label="Remove task"
      >
        <TrashIcon />
      </Button>
    </div>
  );
}

// ---- React-select custom indicator components ----

type SelectOption = { value: string; label: string };

const selectIconOverrides = {
  DropdownIndicator: (props: DropdownIndicatorProps<SelectOption, true>) => (
    <selectComponents.DropdownIndicator {...props}>
      <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
    </selectComponents.DropdownIndicator>
  ),
  ClearIndicator: (props: ClearIndicatorProps<SelectOption, true>) => (
    <selectComponents.ClearIndicator {...props}>
      <XIcon className="h-4 w-4 text-muted-foreground" />
    </selectComponents.ClearIndicator>
  ),
  MultiValueRemove: (props: MultiValueRemoveProps<SelectOption, true>) => (
    <selectComponents.MultiValueRemove {...props}>
      <XIcon className="h-3 w-3" />
    </selectComponents.MultiValueRemove>
  ),
  IndicatorSeparator: () => null,
};

// ---- RoutineModals (owns all modal state — changes here don't re-render the card list) ----

export interface RoutineModalsHandle {
  openCreate: () => void;
  openEdit: (routine: Routine) => void;
  openDelete: (routine: Routine) => void;
}

interface RoutineModalsProps {
  goals: Goal[];
  routineCount: number;
  onCreated: (routine: Routine) => void;
  onUpdated: (routine: Routine) => void;
  onDeleted: (routineId: string) => void;
}

interface FormTask {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  rrule: "",
  description: "",
  goalIds: [] as string[],
  tasks: [] as FormTask[],
  newTask: "",
  locationTrigger: null as LocationTrigger | null,
};

function normalizeRRule(input: string): string {
  return input.trim().replace(/^RRULE:/i, "").toUpperCase();
}

function scheduleFromRRule(input: string): { rrule?: string; cron?: string; error?: string } {
  const rrule = normalizeRRule(input);
  if (!rrule) return {};
  const cron = rruleToCron(rrule);
  return cron ? { rrule, cron } : { rrule, error: "Unsupported RRULE for scheduling" };
}

type ScheduleFrequency = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
type RRuleParts = {
  frequency: ScheduleFrequency;
  hour: string;
  minute: string;
  byDay: string[];
  monthDay: string;
};

const WEEKDAYS = [
  { value: "MO", label: "Mon" },
  { value: "TU", label: "Tue" },
  { value: "WE", label: "Wed" },
  { value: "TH", label: "Thu" },
  { value: "FR", label: "Fri" },
  { value: "SA", label: "Sat" },
  { value: "SU", label: "Sun" },
];

function parseRRuleParts(input: string): RRuleParts {
  const parts: Record<string, string> = {};
  for (const part of normalizeRRule(input).split(";")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key] = value;
  }
  const freq = parts.FREQ as ScheduleFrequency | undefined;
  return {
    frequency: freq && ["DAILY", "WEEKLY", "MONTHLY"].includes(freq) ? freq : "NONE",
    hour: parts.BYHOUR?.split(",")[0] ?? "8",
    minute: parts.BYMINUTE?.split(",")[0] ?? "0",
    byDay: parts.BYDAY ? parts.BYDAY.split(",").filter(Boolean) : ["MO"],
    monthDay: parts.BYMONTHDAY?.split(",")[0] ?? "1",
  };
}

function buildRRule(parts: RRuleParts): string {
  if (parts.frequency === "NONE") return "";
  const hour = Math.max(0, Math.min(23, Number(parts.hour) || 0));
  const minute = Math.max(0, Math.min(59, Number(parts.minute) || 0));
  const rule = [`FREQ=${parts.frequency}`, `BYHOUR=${hour}`, `BYMINUTE=${minute}`];
  if (parts.frequency === "WEEKLY") rule.push(`BYDAY=${(parts.byDay.length ? parts.byDay : ["MO"]).join(",")}`);
  if (parts.frequency === "MONTHLY") rule.push(`BYMONTHDAY=${Math.max(1, Math.min(31, Number(parts.monthDay) || 1))}`);
  return rule.join(";");
}

const RoutineModals = forwardRef<RoutineModalsHandle, RoutineModalsProps>(
  function RoutineModals({ goals, routineCount, onCreated, onUpdated, onDeleted }, ref) {
    const { use24Hour } = useTimeFormat();
    const taskSensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [developerMode, setDeveloperMode] = useState(false);

    useEffect(() => {
      const syncDeveloperMode = () => setDeveloperMode(localStorage.getItem("developerMode") === "true");
      syncDeveloperMode();
      window.addEventListener("developerModeChanged", syncDeveloperMode);
      return () => window.removeEventListener("developerModeChanged", syncDeveloperMode);
    }, []);

    useImperativeHandle(ref, () => ({
      openCreate: () => {
        setFormData(emptyForm);
        setShowCreateModal(true);
      },
      openEdit: (routine: Routine) => {
        setSelectedRoutine(routine);
        const goalIds = routine.goalIds || (routine.goalId ? [routine.goalId] : []);
        setFormData({
          name: routine.name,
          rrule: routine.rrule || (routine.cron ? cronToRRule(routine.cron).rrule : ""),
          description: routine.description || "",
          goalIds,
          tasks: (routine.tasks ?? []).map((t) => ({ id: t.id, name: t.name })),
          newTask: "",
          locationTrigger: routine.locationTrigger || null,
        });
        setShowEditModal(true);
      },
      openDelete: (routine: Routine) => {
        setSelectedRoutine(routine);
        setShowDeleteModal(true);
      },
    }), []);

    const createRoutine = async () => {
      if (!formData.name) {
        alert("Please enter a routine name");
        return;
      }
      const schedule = scheduleFromRRule(formData.rrule);
      if (schedule.error) {
        alert(`${schedule.error}. Try a DAILY, WEEKLY, MONTHLY, HOURLY, or MINUTELY rule with BYHOUR/BYMINUTE as needed.`);
        return;
      }
      const id = `routine-${Date.now()}`;
      const newRoutine: Routine = {
        id,
        name: formData.name,
        rrule: schedule.rrule,
        cron: schedule.cron,
        status: schedule.rrule ? "pending" : undefined,
        locationTrigger: formData.locationTrigger || undefined,
        index: routineCount,
        description: formData.description.trim() || undefined,
        goalIds: formData.goalIds.length > 0 ? formData.goalIds : undefined,
        tasks: formData.tasks.map((t, index) => ({
          id: t.id,
          name: t.name,
          routineId: id,
          index,
          status: "pending",
        })),
      };
      await remoteStorageClient.saveRoutine(newRoutine);
      onCreated(newRoutine);
      setShowCreateModal(false);
      setFormData(emptyForm);
    };

    const updateRoutine = async () => {
      if (!selectedRoutine) return;
      const schedule = scheduleFromRRule(formData.rrule);
      if (schedule.error) {
        alert(`${schedule.error}. Try a DAILY, WEEKLY, MONTHLY, HOURLY, or MINUTELY rule with BYHOUR/BYMINUTE as needed.`);
        return;
      }
      const updatedRoutine: Routine = {
        ...selectedRoutine,
        name: formData.name,
        rrule: schedule.rrule,
        cron: schedule.cron,
        locationTrigger: formData.locationTrigger || undefined,
        description: formData.description.trim() || undefined,
        goalIds: formData.goalIds.length > 0 ? formData.goalIds : undefined,
        tasks: formData.tasks.map((t, index) => {
          const existingTask = selectedRoutine.tasks.find((st) => st.id === t.id);
          if (existingTask) {
            return { ...existingTask, name: t.name, index };
          }
          return {
            id: t.id,
            name: t.name,
            routineId: selectedRoutine.id,
            index,
            status: "pending" as const,
          };
        }),
      };
      await remoteStorageClient.saveRoutine(updatedRoutine);
      onUpdated(updatedRoutine);
      setShowEditModal(false);
      setSelectedRoutine(null);
      setFormData(emptyForm);
    };

    const deleteRoutine = async () => {
      if (!selectedRoutine) {
        setShowDeleteModal(false);
        return;
      }
      try {
        await remoteStorageClient.deleteRoutine(selectedRoutine.id);
        try {
          const completions = await fetchCompletions();
          const toDelete = completions.filter((c) => c.routineId === selectedRoutine.id);
          await Promise.all(toDelete.map((c) => remoteStorageClient.deleteRoutineCompletion(c.routineInstanceId)));
        } catch (err) {
          console.error("Failed to delete routine completions:", err);
        }
        onDeleted(selectedRoutine.id);
        setShowDeleteModal(false);
        setShowEditModal(false);
        setSelectedRoutine(null);
        window.dispatchEvent(new CustomEvent("tasksUpdated"));
        window.dispatchEvent(new CustomEvent("goalUpdated"));
      } catch (error) {
        console.error("Failed to delete routine:", error);
        alert(`Failed to delete routine: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    const addTaskToForm = () => {
      if (!formData.newTask.trim()) return;
      setFormData({
        ...formData,
        tasks: [...formData.tasks, { id: uuidv4(), name: formData.newTask.trim() }],
        newTask: "",
      });
    };

    const removeTaskFromForm = (id: string) => {
      setFormData({ ...formData, tasks: formData.tasks.filter((t) => t.id !== id) });
    };

    const updateSchedule = (updates: Partial<RRuleParts>) => {
      const current = parseRRuleParts(formData.rrule);
      setFormData({ ...formData, rrule: buildRRule({ ...current, ...updates }) });
    };

    const scheduleParts = parseRRuleParts(formData.rrule);
    const schedule = scheduleFromRRule(formData.rrule);

    const isFormOpen = showCreateModal || showEditModal;
    const closeForm = () => {
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedRoutine(null);
    };

    return (
      <>
        {/* Create/Edit Sheet */}
        <Sheet open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg"
          >
            <SheetHeader className="border-b border-border px-6 py-4">
              <SheetTitle>{showEditModal ? "Edit Routine" : "Create Routine"}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Routine Name <span className="text-destructive" aria-hidden>*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Routine, Workout..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Describe your routine and what it helps you achieve..."
                  minHeight="120px"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Schedule
                </label>
                <div className="space-y-3 rounded-control border border-border p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Repeat</label>
                      <select
                        value={scheduleParts.frequency}
                        onChange={(e) => updateSchedule({ frequency: e.target.value as ScheduleFrequency })}
                        className="h-10 w-full rounded border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="NONE">No schedule</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    {scheduleParts.frequency !== "NONE" && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={scheduleParts.hour}
                            onChange={(e) => updateSchedule({ hour: e.target.value })}
                            aria-label="Hour"
                          />
                          <span className="text-muted-foreground">:</span>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            value={scheduleParts.minute}
                            onChange={(e) => updateSchedule({ minute: e.target.value })}
                            aria-label="Minute"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {scheduleParts.frequency === "WEEKLY" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Days</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map((day) => {
                          const selected = scheduleParts.byDay.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => {
                                const byDay = selected
                                  ? scheduleParts.byDay.filter((value) => value !== day.value)
                                  : [...scheduleParts.byDay, day.value];
                                updateSchedule({ byDay });
                              }}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {scheduleParts.frequency === "MONTHLY" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Day of month</label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={scheduleParts.monthDay}
                        onChange={(e) => updateSchedule({ monthDay: e.target.value })}
                      />
                    </div>
                  )}

                  {formData.rrule && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{schedule.cron ? getDescription(schedule.cron, { use24Hour }) : "Unsupported RRULE for scheduling"}</p>
                      {developerMode && (
                        <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                          {normalizeRRule(formData.rrule)}
                        </code>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <LocationTriggerInput
                value={formData.locationTrigger}
                onChange={(locationTrigger) => setFormData({ ...formData, locationTrigger })}
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Goals
                </label>
                <Select
                  isMulti
                  options={goals.map((g) => ({ value: g.id, label: g.name }))}
                  value={formData.goalIds
                    .map((id) => {
                      const goal = goals.find((g) => g.id === id);
                      return goal ? { value: goal.id, label: goal.name } : null;
                    })
                    .filter((opt): opt is { value: string; label: string } => opt !== null)}
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      goalIds: selected.map((opt) => opt.value),
                    })
                  }
                  placeholder="Select goals..."
                  classNamePrefix="react-select"
                  components={selectIconOverrides}
                  unstyled
                  classNames={{
                    control: () =>
                      "w-full rounded-chip border border-input bg-background px-2 py-1 text-sm min-h-[44px] hover:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
                    valueContainer: () => "gap-1 flex-wrap",
                    multiValue: () =>
                      "bg-primary/10 text-primary rounded-full pl-2 pr-1 py-0.5 flex items-center gap-1 text-sm",
                    multiValueLabel: () => "text-primary text-sm",
                    multiValueRemove: () =>
                      "hover:text-primary/70 cursor-pointer rounded-full ml-0.5",
                    placeholder: () => "text-muted-foreground",
                    input: () => "text-foreground",
                    menu: () =>
                      "mt-1 rounded-control border border-input bg-popover text-popover-foreground shadow-md overflow-hidden",
                    menuList: () => "py-1",
                    option: ({ isFocused, isSelected }) =>
                      [
                        "px-3 py-2 text-sm cursor-pointer",
                        isFocused ? "bg-accent text-accent-foreground" : "",
                        isSelected ? "bg-primary/10 text-primary" : "",
                      ].join(" "),
                    noOptionsMessage: () => "px-3 py-2 text-sm text-muted-foreground",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tasks</label>
                <div className="space-y-2">
                  <DndContext
                    sensors={taskSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (!over || active.id === over.id) return;
                      const oldIndex = formData.tasks.findIndex((t) => t.id === active.id);
                      const newIndex = formData.tasks.findIndex((t) => t.id === over.id);
                      if (oldIndex < 0 || newIndex < 0) return;
                      setFormData({ ...formData, tasks: arrayMove(formData.tasks, oldIndex, newIndex) });
                    }}
                  >
                    <SortableContext
                      items={formData.tasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.tasks.map((task) => (
                        <SortableTaskRow
                          key={task.id}
                          id={task.id}
                          name={task.name}
                          onRemove={() => removeTaskFromForm(task.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={formData.newTask}
                      onChange={(e) => setFormData({ ...formData, newTask: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addTaskToForm()}
                      placeholder="Add a task..."
                      className="grow"
                    />
                    <Button type="button" size="icon" onClick={addTaskToForm}>
                      <PlusIcon />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            </div>
            <SheetFooter className="border-t border-border px-6 py-4">
              <div className="flex w-full gap-2 justify-between">
                {showEditModal && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => { setShowEditModal(false); setShowDeleteModal(true); }}
                  >
                    Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="secondary" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={showEditModal ? updateRoutine : createRoutine}>
                    {showEditModal ? "Save Changes" : "Create Routine"}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} closeModal={() => setShowDeleteModal(false)}>
          <Modal.Title>Delete Routine</Modal.Title>
          <Modal.Body>
            <p className="text-foreground">
              Are you sure you want to delete &quot;{selectedRoutine?.name || "this routine"}&quot;?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Note: Tasks created from this routine will be kept, but routine completions will be removed.
              </span>
            </p>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={deleteRoutine}>
                Delete
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
);

// ---- Page ----

export default function RoutinesPageContent() {
  const [routines, setRoutines] = useState<Routine[]>(() => cachedRoutines ?? []);
  const modalsRef = useRef<RoutineModalsHandle>(null);
  const { completions, getStreaksForRoutine, reload: reloadCompletions } = useRoutineCompletions();
  const { goals, reload: reloadGoals } = useGoals();

  useEffect(() => {
    const handleGoalUpdate = () => reloadGoals();
    window.addEventListener("goalUpdated", handleGoalUpdate);
    return () => window.removeEventListener("goalUpdated", handleGoalUpdate);
  }, [reloadGoals]);

  const loadRoutines = async () => {
    try {
      const loaded = await remoteStorageClient.getRoutines();
      const valid = (loaded as Routine[]).filter((r) => r?.id && r?.name);
      const sorted = valid.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      cachedRoutines = sorted;
      setRoutines(sorted);
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  };

  useEffect(() => {
    (async () => {
      await loadRoutines();
    })();
  }, []);

  useEffect(() => {
    const handleOpenCreateRoutine = () => modalsRef.current?.openCreate();
    window.addEventListener("openCreateRoutine", handleOpenCreateRoutine);
    return () => window.removeEventListener("openCreateRoutine", handleOpenCreateRoutine);
  }, []);

  // Deep link from the Home page's "+ New routine" button (?create=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    modalsRef.current?.openCreate();
    params.delete("create");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/routines?${query}` : "/routines");
  }, []);

  const handleDelete = useCallback((routine: Routine) => {
    modalsRef.current?.openDelete(routine);
  }, []);

  const handleEdit = useCallback((routine: Routine) => {
    modalsRef.current?.openEdit(routine);
  }, []);

  const handlePlay = useCallback(async (routine: Routine) => {
    const routineInstanceId = `${routine.id}-manual-${Date.now()}`;
    const tasks = routine.tasks ?? [];

    for (const task of tasks) {
      const standaloneTask: StandaloneTask = {
        id: uuidv4(),
        name: task.name,
        status: "due",
        createdAt: Date.now(),
        routineId: routine.id,
        routineInstanceId,
      };
      await remoteStorageClient.addStandaloneTask(standaloneTask);
    }

    window.dispatchEvent(new CustomEvent("tasksUpdated"));
    toast.success(`Added ${tasks.length} task${tasks.length !== 1 ? "s" : ""} from "${routine.name}"`);
  }, []);

  const completionsByRoutine = useMemo(() => {
    const map = new Map<string, RoutineCompletion[]>();
    for (const c of completions) {
      const arr = map.get(c.routineId);
      if (arr) arr.push(c);
      else map.set(c.routineId, [c]);
    }
    return map;
  }, [completions]);

  const scheduledRoutines = routines.filter((r) => r.cron || r.locationTrigger);
  const unscheduledRoutines = routines.filter((r) => !r.cron && !r.locationTrigger);

  return (
    <>
      {/* Mobile New Routine Button */}
      <Button
        size="lg"
        onClick={() => modalsRef.current?.openCreate()}
        className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] gap-2 shadow-lg"
      >
        <PlusIcon />
        <span>New Routine</span>
      </Button>

      {/* Scheduled Routines */}
      {scheduledRoutines.length > 0 && (
        <div className="mb-8">
          <div className="-mx-4 px-4 border-b border-border pb-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">Scheduled Routines</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {scheduledRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                routineCompletions={completionsByRoutine.get(routine.id) ?? []}
                goals={goals}
                getStreaksForRoutine={getStreaksForRoutine}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled Routines */}
      {unscheduledRoutines.length > 0 && (
        <div>
          <div
            className={
              scheduledRoutines.length > 0
                ? "-mx-4 px-4 border-t border-b border-border py-3 mb-4"
                : "-mx-4 px-4 border-b border-border pb-3 mb-4"
            }
          >
            <h2 className="text-sm font-semibold text-foreground">Unscheduled Routines</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {unscheduledRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                routineCompletions={completionsByRoutine.get(routine.id) ?? []}
                goals={goals}
                getStreaksForRoutine={getStreaksForRoutine}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPlay={handlePlay}
              />
            ))}
          </div>
        </div>
      )}

      {routines.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground mb-4">No routines yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first routine to get started
          </p>
          <Button type="button" onClick={() => modalsRef.current?.openCreate()}>
            Create Your First Routine
          </Button>
        </div>
      )}

      <RoutineModals
        ref={modalsRef}
        goals={goals}
        routineCount={routines.length}
        onCreated={(r) => setRoutines((prev) => [...prev, r])}
        onUpdated={(r) => setRoutines((prev) => prev.map((x) => (x.id === r.id ? r : x)))}
        onDeleted={(id) => setRoutines((prev) => prev.filter((r) => r.id !== id))}
      />
    </>
  );
}
