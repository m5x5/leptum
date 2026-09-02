import type { LocationUpdate, GroceryNotification, GroceryStore } from '../types/grocery';
import type { ExperimentId } from './experiments';
import { getSolidSessionIfActive } from './solidAuth';
import * as solidTasks from './solidRdf/taskBackend';
import { getResolvedContainers } from './solidRdf/activeContainers';
import { goalBackend } from './solidRdf/goalBackend';
import { goalTypeBackend } from './solidRdf/goalTypeBackend';
import { insightBackend } from './solidRdf/insightBackend';
import { patternNoteBackend } from './solidRdf/patternNoteBackend';
import * as solidQuickNotes from './solidRdf/quickNoteBackend';
import { velocityBackend } from './solidRdf/velocityBackend';
import { impactBackend } from './solidRdf/impactBackend';
import { emitPodWrite } from './podWriteBus';
import { lifeEventBackend } from './solidRdf/lifeEventBackend';
import { routineCompletionBackend } from './solidRdf/routineCompletionBackend';
import { activityWatchBackend } from './solidRdf/activityWatchBackend';
import * as solidPhotos from './solidRdf/imageBackend';
import * as solidWeekReflections from './solidRdf/weekReflectionBackend';
import * as solidEntities from './solidRdf/entityBackend';
import * as solidMentions from './solidRdf/mentionBackend';
import * as solidRoutines from './solidRdf/routineBackend';
import { userSettingsBackend } from './solidRdf/userSettingsBackend';
import { getSolidProfileBirthDate } from './solidProfile';
import { locationBackend } from './solidRdf/locationBackend';
import { groceryStoreBackend } from './solidRdf/groceryStoreBackend';
import { groceryNotificationBackend } from './solidRdf/groceryNotificationBackend';
import { healthBackend } from './solidRdf/healthBackend';

export interface StorageChangeEvent {
  relativePath: string;
  origin: string;
  oldValue: unknown;
  newValue: unknown;
}

// ---- Domain type interfaces exported from this module ----

export interface GoalMilestone {
  id: string;
  name: string;
  targetDate?: number | null;
  completed: boolean;
  completedAt?: number | null;
  order: number;
}

export interface DailyTrackingEntry {
  date: string;
  value?: number;
  completed?: boolean;
  notes?: string;
  timestamp?: number;
}

export interface GoalTrackingConfig {
  type: 'counter' | 'checklist' | 'timer' | 'amount';
  unit: string;
  icon: string;
  dailyTarget?: number;
  maxPerDay?: number;
  increments?: number[];
  options?: string[];
}

export interface Goal {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  description?: string | null;
  targetDate?: number | null;
  createdAt?: number | null;
  completedAt?: number | null;
  status?: string | null;
  milestones?: GoalMilestone[] | null;
  templateId?: string | null;
  trackingConfig?: GoalTrackingConfig;
  trackingData?: { entries: DailyTrackingEntry[] } | null;
}

export interface GoalType {
  id: string;
  name: string;
  description?: string | null;
}

export interface PhotoAttachment {
  id: string;
  impactId: string;
  thumbnail: string;
  fullImagePath?: string;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: number;
  caption?: string;
}

export interface Impact {
  id?: string;
  activity: string;
  date: number;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  happiness?: string | number;
  confidence?: string | number;
  energy?: string | number;
  focus?: string | number;
  shame?: string | number;
  guilt?: string | number;
  goalId?: string;
  notes?: string;
  photoIds?: string[];
  endTime?: number;
  allDay?: boolean;
  sourceUrl?: string;
  requiresOnlineTime?: boolean;
  dismissed?: boolean;
}

export type Emotion = 'happy' | 'sad' | 'neutral' | 'excited' | 'anxious' | 'calm' | 'frustrated' | 'proud' | 'tired' | 'energized';

export interface StandaloneTask {
  id: string;
  name: string;
  description?: string;
  status: 'due' | 'completed' | 'pending';
  createdAt: number;
  completedAt?: number;
  archivedAt?: number;
  goalId?: string;
  effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  numericEstimate?: number;
  emotions?: Emotion[];
  routineId?: string;
  routineInstanceId?: string;
  sortIndex?: number;
  // Geolocation (WGS84)
  lat?: number;
  lon?: number;
  // Indoor / apartment-local coordinates (metres from a reference corner)
  indoorX?: number;
  indoorY?: number;
}

export interface HomeTask extends StandaloneTask {}

export interface RoutineCompletion {
  routineId: string;
  routineInstanceId: string;
  routineName: string;
  completedAt: number;
  taskCount: number;
}

export interface RoutineTask {
  id: string;
  name: string;
  routineId: string;
  index: number;
  status: string;
  description?: string;
  completedAt?: number;
  effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  numericEstimate?: number;
}

export interface Routine {
  id: string;
  name: string;
  rrule?: string;
  cron?: string;
  status?: string;
  lastEndTime?: number;
  index: number;
  description?: string | null;
  goalIds?: string[];
  goalId?: string;
  isShowUpRoutine?: boolean;
  tasks: RoutineTask[];
}

export interface AffectedMetric {
  metric: string;
  effect: 'positive' | 'negative';
}

export interface Insight {
  id: string;
  name: string;
  affectedMetrics: AffectedMetric[];
  notes?: string;
  category?: string;
  createdAt: number;
}

export interface PatternNote {
  activity: string;
  notes: string;
  createdAt: number;
  updatedAt?: number;
}

export interface QuickNote {
  id: string;
  text?: string;
  photoIds?: string[];
  audioPath?: string;
  audioDuration?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface WeekReflection {
  id: string; // Monday date "YYYY-MM-DD"
  text?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DayNote {
  id: string; // date key "YYYY-MM-DD"
  text?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface LifeEvent {
  id: string;
  label: string;
  startWeek: string; // "YYYY-MM-DD" Monday
  endWeek: string;   // "YYYY-MM-DD" Monday (inclusive)
  color: string;     // hex color e.g. "#ef4444"
  createdAt: number;
  updatedAt?: number;
}

export interface Entity {
  id: string;
  name: string;
  type?: 'person' | 'project' | 'context' | null;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface Mention {
  id: string;
  sourceType: string;
  sourceId: string;
  entityId: string;
  context?: string;
  position?: number;
  fieldName?: string;
  createdAt: number;
}

// Velocity tracking schemas
export interface VelocityEntry {
   id: string;
   taskId: string;
   taskName: string;
   effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
   numericEstimate?: number;
   completedAt: number;
   period: string;
}

export type TimeFormat = '12h' | '24h' | 'system';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserSettings {
  /** Read from the user's Solid profile/WebID when available; not stored in Leptum preferences. */
  dateOfBirth?: string;
  showKeyboardShortcuts?: boolean;
  developerMode?: boolean;
  /** Opt-in experimental features (see lib/experiments.ts). Absent/empty = all off. */
  enabledExperiments?: ExperimentId[];
  theme?: ThemePreference;
  timeFormat?: TimeFormat;
  wakingStartHour?: number;
  wakingEndHour?: number;
  /** vcard:AddressBook IRIs whose every contact is offered as an @mention. Both lists empty = all books. */
  suggestContactsFromAddressBooks?: string[];
  /** vcard:Group IRIs whose members are offered as an @mention. */
  suggestContactsFromGroups?: string[];
}

export class StorageClient {
  private async solid() {
    return await getSolidSessionIfActive();
  }

  private async requireSolid(): Promise<Awaited<ReturnType<typeof getSolidSessionIfActive>> & { webId: string }> {
    const solid = await this.solid();
    if (!solid?.webId) {
      throw new Error('Connect a Solid Pod before saving data.');
    }
    return solid as Awaited<ReturnType<typeof getSolidSessionIfActive>> & { webId: string };
  }

  // User settings operations
  public async getUserSettings(): Promise<UserSettings> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        const settings = (await userSettingsBackend.get(solid, solid.webId)) ?? {};
        const profileBirthDate = await getSolidProfileBirthDate(solid.webId, solid);
        return profileBirthDate ? { ...settings, dateOfBirth: profileBirthDate } : settings;
      } catch (error) {
        console.error('Failed to get user settings from Solid pod:', error);
        return {};
      }
    }
    return {};
  }

  public async saveUserSettings(settings: UserSettings): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await userSettingsBackend.save(solid, solid.webId, settings);
    }
  }

  // Goal operations
  public async getGoals(): Promise<Goal[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await goalBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list goals from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveGoal(goal: Goal) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await goalBackend.save(solid, solid.webId, goal);
    }
  }

  public async deleteGoal(goalId: string) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await goalBackend.delete(solid, solid.webId, goalId);
    }
  }

  // Goal Type operations
  public async getGoalTypes(): Promise<GoalType[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await goalTypeBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list goal types from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveGoalType(goalType: GoalType) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await goalTypeBackend.save(solid, solid.webId, goalType);
    }
  }

  public async deleteGoalType(id: string): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — goal type was not deleted.');
    await goalTypeBackend.delete(solid, solid.webId, id);
  }

  // Impact operations
  public async getImpacts(): Promise<Impact[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await impactBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list impacts from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  /**
   * Reconciles the pod with `impacts`. Only changed impacts are written and
   * only impacts this client has previously loaded (and are now missing from
   * the array) are deleted — see lib/solidRdf/collectionBackend.ts.
   * Prefer saveImpact()/deleteImpact() for single-record changes.
   */
  public async saveImpacts(impacts: Impact[]) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — impacts were not saved.');
    return await impactBackend.saveAll(solid, solid.webId, impacts);
  }

  public async saveImpact(impact: Impact) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — impact was not saved.');
    return await impactBackend.save(solid, solid.webId, impact);
  }

  public async deleteImpact(id: string) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — impact was not deleted.');
    return await impactBackend.delete(solid, solid.webId, id);
  }

  // Routine operations (unified Jobs + Stacks)
  public async getRoutines(): Promise<Routine[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await solidRoutines.listRoutines(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list routines from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  /** Get a single routine by id (e.g. for Show Up) without loading all routines. */
  public async getRoutine(id: string): Promise<Routine | null> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await solidRoutines.getRoutine(solid, solid.webId, id);
      } catch (error) {
        console.error('Failed to get routine from Solid pod:', error);
        return null;
      }
    }
    return null;
  }

  public async saveRoutine(routine: Routine) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await solidRoutines.saveRoutine(solid, solid.webId, routine);
    }
    emitPodWrite('routines');
  }

  public async deleteRoutine(routineId: string) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await solidRoutines.deleteRoutine(solid, solid.webId, routineId);
    }
    emitPodWrite('routines');
  }

  // Standalone Task operations
  public async getStandaloneTasks() {
    return this.getHomeTasks();
  }

  public async addStandaloneTask(task: StandaloneTask) {
    const solid = await this.requireSolid();
    const result = await solidTasks.saveTask(solid, solid.webId, task);
    emitPodWrite('tasks');
    return result;
  }

  public async reorderHomeTasks(orderedIds: string[]): Promise<void> {
    const solid = await this.requireSolid();
    const result = await solidTasks.reorderTasks(solid, solid.webId, orderedIds);
    emitPodWrite('tasks');
    return result;
  }

  public async updateStandaloneTask(taskId: string, updates: Partial<StandaloneTask>) {
    const solid = await this.requireSolid();
    const result = await solidTasks.updateTask(solid, solid.webId, taskId, updates);
    emitPodWrite('tasks');
    return result;
  }

  public async deleteStandaloneTask(taskId: string) {
    const solid = await this.requireSolid();
    const result = await solidTasks.deleteTask(solid, solid.webId, taskId);
    emitPodWrite('tasks');
    return result;
  }

  /** Every task, archived ones included — the single source the tasks query caches. */
  public async getAllTasks(): Promise<StandaloneTask[]> {
    const solid = await this.solid();
    if (!solid?.webId) return [];
    return await solidTasks.listTasks(solid, solid.webId);
  }

  public async getHomeTasks(): Promise<StandaloneTask[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return (await solidTasks.listTasks(solid, solid.webId)).filter((task) => !task.archivedAt);
      } catch (error) {
        console.error('Failed to list tasks from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  /** Resolved URL of the tasks container, for subscribing to live pod notifications (see useStandaloneTasks). */
  public async getTasksContainerUrl(): Promise<string | null> {
    const solid = await this.solid();
    if (!solid?.webId) return null;
    const containers = await getResolvedContainers(solid, solid.webId);
    return containers.tasks;
  }

  /** Mark tasks as archived in-place. */
  public async appendArchivedTasks(tasksToArchive: StandaloneTask[]): Promise<void> {
    if (!tasksToArchive.length) return;
    const solid = await this.solid();
    if (!solid?.webId) return;
    const webId = solid.webId;
    const now = Date.now();
    await Promise.all(tasksToArchive.map((task) =>
      solidTasks.saveTask(solid, webId, { ...task, archivedAt: task.archivedAt ?? now })
    ));
    emitPodWrite('tasks');
  }

  // Routine Completion operations
  public async getRoutineCompletions(): Promise<RoutineCompletion[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await routineCompletionBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list routine completions from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveRoutineCompletions(completions: RoutineCompletion[]) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await routineCompletionBackend.saveAll(solid, solid.webId, completions);
    }
    emitPodWrite('completions');
  }

  public async addRoutineCompletion(completion: RoutineCompletion) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — completion was not saved.');
    await routineCompletionBackend.save(solid, solid.webId, completion);
    emitPodWrite('completions');
  }

  public async deleteRoutineCompletion(routineInstanceId: string) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — completion was not deleted.');
    await routineCompletionBackend.delete(solid, solid.webId, routineInstanceId);
    emitPodWrite('completions');
  }

  // ActivityWatch operations
  public async getActivityWatchData(): Promise<import('../activity-watch.d').ActivityWatchData | null> {
    const solid = await this.solid();
    if (!solid?.webId) return null;
    try {
      return await activityWatchBackend.get(solid, solid.webId);
    } catch (error) {
      console.error('Failed to get ActivityWatch data:', error);
      return null;
    }
  }

  public async saveActivityWatchData(data: import('../activity-watch.d').ActivityWatchData) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await activityWatchBackend.save(solid, solid.webId, data);
    }
  }

  public async clearActivityWatchData() {
    const solid = await this.solid();
    if (solid?.webId) {
      await activityWatchBackend.save(solid, solid.webId, { importedAt: Date.now(), events: [], buckets: [] });
    }
  }

  public async getActivityWatchEventsInRange(start: number, end: number) {
    try {
      const data = await this.getActivityWatchData();
      if (!data || !data.events) return [];

      return data.events.filter(event =>
        event.timestamp >= start && event.timestamp <= end
      );
    } catch (error) {
      console.error('Failed to get ActivityWatch events in range:', error);
      return [];
    }
  }

  // Insights operations
  public async getInsights(): Promise<Insight[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await insightBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list insights from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveInsight(insight: Insight): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — insight was not saved.');
    await insightBackend.save(solid, solid.webId, insight);
  }

  public async deleteInsight(id: string): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — insight was not deleted.');
    await insightBackend.delete(solid, solid.webId, id);
  }

  // Pattern Notes operations
  public async getPatternNotes(): Promise<PatternNote[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await patternNoteBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list pattern notes from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async savePatternNote(note: PatternNote): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — pattern note was not saved.');
    await patternNoteBackend.save(solid, solid.webId, note);
  }

  public async deletePatternNote(activity: string): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — pattern note was not deleted.');
    await patternNoteBackend.delete(solid, solid.webId, activity);
  }

  // Entity operations
  public async getEntities(): Promise<Entity[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await solidEntities.listEntities(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list entities from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveEntity(entity: Entity): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — entity was not saved.');
    await solidEntities.saveEntity(solid, solid.webId, entity);
  }

  public async deleteEntity(id: string, type?: Entity['type']): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — entity was not deleted.');
    await solidEntities.deleteEntity(solid, solid.webId, id, type);
  }

  // Mention operations
  public async getMentions(): Promise<Mention[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await solidMentions.listMentions(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list mentions from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveMention(mention: Mention): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — mention was not saved.');
    await solidMentions.mentionBackend.save(solid, solid.webId, mention);
  }

  public async deleteMention(id: string): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — mention was not deleted.');
    await solidMentions.mentionBackend.delete(solid, solid.webId, id);
  }

  // Photo operations
  public async getPhotos(): Promise<PhotoAttachment[]> {
    const solid = await this.solid();
    if (!solid?.webId) return [];
    try {
      return await solidPhotos.listPhotos(solid, solid.webId);
    } catch (error) {
      console.error('Failed to get photos:', error);
      return [];
    }
  }

  /** Rewrite one photo's metadata resource (caption etc.). */
  public async updatePhoto(photo: PhotoAttachment): Promise<void> {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — photo was not updated.');
    await solidPhotos.savePhotoMetadata(solid, solid.webId, photo);
  }

  public async addPhoto(photo: PhotoAttachment) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — photo was not saved.');
    return await solidPhotos.savePhotoMetadata(solid, solid.webId, photo);
  }

  public async getPhotosForImpact(impactId: string) {
    const photos = await this.getPhotos();
    return photos.filter(photo => photo.impactId === impactId);
  }

  public async deletePhoto(photoId: string) {
    const solid = await this.solid();
    if (solid?.webId) {
      return await solidPhotos.deletePhoto(solid, solid.webId, photoId);
    }
  }

  public async deletePhotosForImpact(impactId: string) {
    const photos = await this.getPhotos();
    await Promise.all(photos.filter((photo) => photo.impactId === impactId).map((photo) => this.deletePhoto(photo.id)));
  }

  // Quick Note operations
  public async getQuickNotes(): Promise<QuickNote[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await solidQuickNotes.quickNoteBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list quick notes from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async addQuickNote(note: QuickNote) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — note was not saved.');
    return await solidQuickNotes.quickNoteBackend.save(solid, solid.webId, note);
  }

  public async updateQuickNote(noteId: string, updates: Partial<QuickNote>) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — note was not updated.');
    const existing = await solidQuickNotes.quickNoteBackend.get(solid, solid.webId, noteId);
    if (!existing) return;
    return await solidQuickNotes.quickNoteBackend.save(solid, solid.webId, { ...existing, ...updates, id: noteId, updatedAt: Date.now() });
  }

  public async deleteQuickNote(noteId: string) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — note was not deleted.');
    return await solidQuickNotes.quickNoteBackend.delete(solid, solid.webId, noteId);
  }

  public async saveQuickNoteAudio(noteId: string, audioBlob: Blob): Promise<string | null> {
    const solid = await this.solid();
    return solid?.webId ? await solidQuickNotes.saveQuickNoteAudio(solid, solid.webId, noteId, audioBlob) : null;
  }

  public async getQuickNoteAudio(path: string): Promise<Blob | null> {
    const solid = await this.solid();
    return solid?.webId ? await solidQuickNotes.getQuickNoteAudio(solid, path) : null;
  }

  // Velocity tracking operations
  public async getVelocityEntries(): Promise<VelocityEntry[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await velocityBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list velocity entries from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async addVelocityEntry(entry: VelocityEntry) {
    const solid = await this.solid();
    if (!solid?.webId) throw new Error('Not connected to a Solid pod — velocity entry was not saved.');
    return await velocityBackend.save(solid, solid.webId, entry);
  }

  public async recordTaskCompletionForVelocity(task: StandaloneTask) {
    if (!task.effort && !task.numericEstimate) return;

    const completedAt = task.completedAt ?? Date.now();
    const entry: VelocityEntry = {
      id: `velocity-${task.id}-${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      effort: task.effort,
      numericEstimate: task.numericEstimate,
      completedAt,
      period: this.getPeriodFromDate(completedAt)
    };

    await this.addVelocityEntry(entry);
  }

  private getPeriodFromDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; // Daily period
  }

  public async getWeeklyVelocity(weeks: number = 4) {
    const entries = await this.getVelocityEntries();
    const now = new Date();
    const weekStart = new Date(now.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000));

    const recentEntries = entries.filter(entry => entry.completedAt >= weekStart.getTime());

    // Group by week
    const weeklyData = new Map();

    recentEntries.forEach(entry => {
      const date = new Date(entry.completedAt);
      const year = date.getFullYear();
      const weekNum = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
      const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          week: weekKey,
          totalNumeric: 0,
          effortCounts: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
          taskCount: 0
        });
      }

      const weekData = weeklyData.get(weekKey);
      weekData.taskCount++;

      if (entry.numericEstimate) {
        weekData.totalNumeric += entry.numericEstimate;
      }

      if (entry.effort) {
        weekData.effortCounts[entry.effort]++;
      }
    });

    return Array.from(weeklyData.values()).sort((a, b) => a.week.localeCompare(b.week));
  }

  public async saveFullImage(photoId: string, data: ArrayBuffer, mimeType: string) {
    const solid = await this.solid();
    return solid?.webId ? await solidPhotos.saveFullImage(solid, solid.webId, photoId, data, mimeType) : null;
  }

  public async getFullImageBlob(path: string, fallbackMime = 'image/jpeg'): Promise<Blob | null> {
    void fallbackMime;
    const solid = await this.solid();
    return solid?.webId ? await solidPhotos.getFullImageBlob(solid, path) : null;
  }

  public onChange(callback: (event: StorageChangeEvent) => void) {
    void callback;
  }

  public offChange(callback: (event: StorageChangeEvent) => void) {
    void callback;
  }

  public onConnect(callback: () => void) {
    void callback;
  }

  public onDisconnect(callback: () => void) {
    void callback;
  }

  public onError(callback: (error: Error) => void) {
    void callback;
  }

  public offError(callback: (error: Error) => void) {
    void callback;
  }

  // Week reflection operations
  public async getWeekReflections(): Promise<Record<string, WeekReflection>> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await solidWeekReflections.listWeekReflections(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list week reflections from Solid pod:', error);
        return {};
      }
    }
    return {};
  }

  public async saveWeekReflection(reflection: WeekReflection): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await solidWeekReflections.saveWeekReflection(solid, solid.webId, reflection);
    }
  }

  public async deleteWeekReflection(id: string): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await solidWeekReflections.deleteWeekReflection(solid, solid.webId, id);
    }
  }

  // Life event operations
  public async getLifeEvents(): Promise<LifeEvent[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        const events = await lifeEventBackend.list(solid, solid.webId);
        return events.sort((a, b) => a.startWeek.localeCompare(b.startWeek));
      } catch (error) {
        console.error('Failed to list life events from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveLifeEvent(event: LifeEvent): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await lifeEventBackend.save(solid, solid.webId, event);
    }
  }

  public async deleteLifeEvent(id: string): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await lifeEventBackend.delete(solid, solid.webId, id);
    }
  }

  // Health Connect data (synced from Android via Leptum app)
  public async getHealthData(): Promise<DailyHealthData[]> {
    const solid = await this.solid();
    if (!solid?.webId) return [];
    try {
      return (await healthBackend.list(solid, solid.webId)).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Failed to get health data:', error);
      return [];
    }
  }

  public async saveLocation(location: LocationUpdate): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await locationBackend.save(solid, solid.webId, location);
    }
  }

  public async getLocation(): Promise<LocationUpdate | null> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await locationBackend.get(solid, solid.webId);
      } catch (error) {
        console.error('Failed to get location from Solid pod:', error);
        return null;
      }
    }
    return null;
  }

  public async getGroceryNotifications(): Promise<GroceryNotification[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await groceryNotificationBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list grocery notifications from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveGroceryNotification(notification: GroceryNotification): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await groceryNotificationBackend.save(solid, solid.webId, notification);
    }
  }

  public async dismissGroceryNotification(id: string): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await groceryNotificationBackend.update(solid, solid.webId, id, { status: 'dismissed' });
    }
  }

  public async acceptGroceryNotification(id: string): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await groceryNotificationBackend.update(solid, solid.webId, id, { status: 'accepted' });
    }
  }

  public async getGroceryStores(): Promise<GroceryStore[]> {
    const solid = await this.solid();
    if (solid?.webId) {
      try {
        return await groceryStoreBackend.list(solid, solid.webId);
      } catch (error) {
        console.error('Failed to list grocery stores from Solid pod:', error);
        return [];
      }
    }
    return [];
  }

  public async saveGroceryStore(store: GroceryStore): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await groceryStoreBackend.save(solid, solid.webId, store);
    }
  }

  public async deleteGroceryStore(storeId: string): Promise<void> {
    const solid = await this.solid();
    if (solid?.webId) {
      return await groceryStoreBackend.delete(solid, solid.webId, storeId);
    }
  }
}

export interface DailyHealthData {
  date: string;
  steps?: number;
  distanceMeters?: number;
  activeCalories?: number;
  totalCalories?: number;
  sleepMinutes?: number;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  restingHeartRate?: number;
  hrvRmssd?: number;
  weightKg?: number;
  bodyFatPct?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodGlucoseMmol?: number;
  oxygenSaturationPct?: number;
  floorsClimbed?: number;
  exerciseSessions?: Array<{
    type: number;
    title?: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
  sleepSessions?: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
}

// Create singleton instance
export const remoteStorageClient = new StorageClient();
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__rsClient = remoteStorageClient;
}
