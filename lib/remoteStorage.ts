// Dynamic imports to avoid SSR issues
let RemoteStorage: any;
let Widget: any;

if (typeof window !== 'undefined') {
  RemoteStorage = require('remotestoragejs');
  Widget = require('m5x5-remotestorage-widget');
}

// Data schemas for RemoteStorage
const JobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    cron: { type: 'string' },
    status: { type: 'string' },
    index: { type: 'number' },
    name: { type: 'string' },
    lastEndTime: { type: 'number' },
    habits: { 
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          jobId: { type: 'string' },
          index: { type: 'number' },
          status: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  },
  required: ['id', 'cron', 'status', 'index', 'name', 'lastEndTime', 'habits']
};

const GoalMilestoneSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    targetDate: { type: ['number', 'null'] },
    completed: { type: 'boolean' },
    completedAt: { type: ['number', 'null'] },
    order: { type: 'number' }
  },
  required: ['id', 'name', 'completed', 'order']
};

const DailyTrackingEntrySchema = {
  type: 'object',
  properties: {
    date: { type: 'string' }, // YYYY-MM-DD format
    value: { type: 'number' },
    completed: { type: 'boolean' },
    notes: { type: 'string' },
    timestamp: { type: 'number' }
  },
  required: ['date']
};

const GoalTrackingConfigSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['counter', 'checklist', 'timer', 'amount'] },
    unit: { type: 'string' },
    icon: { type: 'string' },
    dailyTarget: { type: 'number' },
    maxPerDay: { type: 'number' },
    increments: {
      type: 'array',
      items: { type: 'number' }
    },
    options: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['type', 'unit', 'icon']
};

const GoalSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' },
    color: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    targetDate: { type: ['number', 'null'] },
    createdAt: { type: ['number', 'null'] },
    completedAt: { type: ['number', 'null'] },
    status: { type: ['string', 'null'] },
    milestones: {
      type: ['array', 'null'],
      items: GoalMilestoneSchema
    },
    templateId: { type: ['string', 'null'] }, // Reference to goal template
    trackingConfig: GoalTrackingConfigSchema, // Configuration for visual tracking
    trackingData: {
      type: ['object', 'null'],
      properties: {
        entries: {
          type: 'array',
          items: DailyTrackingEntrySchema
        }
      }
    }
  },
  required: ['id', 'name', 'type']
};

const GoalTypeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] } // Optional rich text description
  },
  required: ['id', 'name']
};

// Photo attachment schema for mood entries
const PhotoAttachmentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    impactId: { type: 'string' },
    thumbnail: { type: 'string' }, // Base64 encoded thumbnail (max ~50KB)
    fullImagePath: { type: ['string', 'null'] }, // Optional path to full image in RemoteStorage
    mimeType: { type: 'string' },
    width: { type: ['number', 'null'] }, // Optional width
    height: { type: ['number', 'null'] }, // Optional height
    createdAt: { type: 'number' },
    caption: { type: ['string', 'null'] } // Optional caption
  },
  required: ['id', 'impactId', 'thumbnail', 'mimeType', 'createdAt']
};

const PhotosCollectionSchema = {
  type: 'object',
  properties: {
    photos: {
      type: 'array',
      items: PhotoAttachmentSchema
    }
  },
  required: ['photos']
};

const ImpactSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    activity: { type: 'string' },
    date: { type: 'number', default: Date.now() },
    stress: { type: ['string', 'number'] },
    fulfillment: { type: ['string', 'number'] },
    motivation: { type: ['string', 'number'] },
    cleanliness: { type: ['string', 'number'] },
    happiness: { type: ['string', 'number'] },
    confidence: { type: ['string', 'number'] },
    energy: { type: ['string', 'number'] },
    focus: { type: ['string', 'number'] },
    shame: { type: ['string', 'number'] },
    guilt: { type: ['string', 'number'] },
    goalId: { type: 'string' },
    notes: { type: 'string' },
    photoIds: { type: 'array', items: { type: 'string' } } // References to photo attachments
  },
  required: ['activity']
};

const ImpactsCollectionSchema = {
  type: 'object',
  properties: {
    impacts: {
      type: 'array',
      items: ImpactSchema
    }
  },
  required: ['impacts']
};

const StackHabitSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    id: { type: 'string' }
  },
  required: ['name', 'id']
};

const StackSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    habits: {
      type: 'array',
      items: StackHabitSchema
    }
  },
  required: ['name']
};

const StandaloneTaskSchema = {
   type: 'object',
   properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'number' },
      completedAt: { type: 'number' },
      archivedAt: { type: 'number' },
      goalId: { type: 'string' },
      effort: { type: 'string', enum: ['XS', 'S', 'M', 'L', 'XL'] },
      numericEstimate: { type: 'number' },
      emotions: { 
        type: 'array', 
        items: { 
          type: 'string',
          enum: ['happy', 'sad', 'neutral', 'excited', 'anxious', 'calm', 'frustrated', 'proud', 'tired', 'energized']
        } 
      },
      routineId: { type: 'string' },
      routineInstanceId: { type: 'string' }
   },
   required: ['id', 'name', 'status', 'createdAt']
};

const StandaloneTasksCollectionSchema = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: StandaloneTaskSchema
    }
  },
  required: ['tasks']
};

// Home tasks: single file for non-archived tasks (homepage loads this only)
const HomeTasksCollectionSchema = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: StandaloneTaskSchema
    }
  },
  required: ['tasks']
};

// Archived tasks: buckets with timestamp name, max 250 tasks per bucket
const ArchivedBucketSchema = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: StandaloneTaskSchema
    },
    createdAt: { type: 'number' }
  },
  required: ['tasks', 'createdAt']
};

const ArchivedIndexSchema = {
  type: 'object',
  properties: {
    bucketIds: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['bucketIds']
};

const WeeklyGoalItemSchema = {
  type: 'object',
  properties: {
    goalId: { type: 'string' },
    targetMinutes: { type: 'number' },
    note: { type: 'string' }
  },
  required: ['goalId']
};

const WeeklyGoalSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    weekStart: { type: 'string' }, // ISO date string (Monday of the week)
    version: { type: 'number' }, // 1 = old text format, 2 = new goalId format
    goals: {
      type: 'object',
      properties: {
        // Each day can contain either strings (v1) or WeeklyGoalItem objects (v2)
        monday: { type: 'array' },
        tuesday: { type: 'array' },
        wednesday: { type: 'array' },
        thursday: { type: 'array' },
        friday: { type: 'array' },
        saturday: { type: 'array' },
        sunday: { type: 'array' }
      }
    },
    legacyGoals: { type: 'object' } // Backup of text-based goals
  },
  required: ['id', 'weekStart', 'goals']
};

// Unified Routine schema (combines Jobs and Stacks)
const RoutineTaskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    routineId: { type: 'string' },
    index: { type: 'number' },
    status: { type: 'string' },
    description: { type: 'string' },
    completedAt: { type: 'number' }
  },
  required: ['id', 'name', 'routineId', 'index', 'status']
};

const RoutineSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    cron: { type: 'string' }, // Optional - for scheduled routines
    status: { type: 'string' },
    lastEndTime: { type: 'number' },
    index: { type: 'number' },
    description: { type: ['string', 'null'] }, // Optional rich text description
    goalIds: { 
      type: 'array', 
      items: { type: 'string' } 
    }, // Optional - array of goal IDs this routine supports (many-to-many)
    goalId: { type: 'string' }, // DEPRECATED: Use goalIds instead. Kept for backward compatibility
    isShowUpRoutine: { type: 'boolean' }, // Special flag for "Show Up" routine
    tasks: {
      type: 'array',
      items: RoutineTaskSchema
    }
  },
  required: ['id', 'name', 'index', 'tasks']
};

// Routine Completion schema
const RoutineCompletionSchema = {
  type: 'object',
  properties: {
    routineId: { type: 'string' },
    routineInstanceId: { type: 'string' },
    routineName: { type: 'string' },
    completedAt: { type: 'number' },
    taskCount: { type: 'number' }
  },
  required: ['routineId', 'routineInstanceId', 'routineName', 'completedAt', 'taskCount']
};

const RoutineCompletionsCollectionSchema = {
  type: 'object',
  properties: {
    completions: {
      type: 'array',
      items: RoutineCompletionSchema
    }
  },
  required: ['completions']
};

// Todonna schema for integration with other apps
const TodonnaItemSchema = {
  type: 'object',
  properties: {
    todo_item_text: { type: 'string' },
    todo_item_status: { type: 'string' },
    todo_item_id: { type: 'string' },
    '@context': { type: 'string' }
  },
  required: ['todo_item_text', 'todo_item_status', 'todo_item_id', '@context']
};

// ActivityWatch schemas
const ProcessedAWEventSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    bucketId: { type: 'string' },
    bucketType: { type: 'string' },
    timestamp: { type: 'number' },
    duration: { type: 'number' },
    displayName: { type: 'string' },
    eventData: { type: 'object' },
    color: { type: 'string' },
    isHidden: { type: 'boolean' }
  },
  required: ['id', 'bucketId', 'bucketType', 'timestamp', 'duration', 'displayName', 'eventData', 'color']
};

const BucketMetadataSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    eventCount: { type: 'number' },
    dateRange: {
      type: 'object',
      properties: {
        start: { type: 'number' },
        end: { type: 'number' }
      },
      required: ['start', 'end']
    },
    isVisible: { type: 'boolean' }
  },
  required: ['id', 'type', 'eventCount', 'dateRange', 'isVisible']
};

const ActivityWatchDataSchema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: ProcessedAWEventSchema
    },
    importedAt: { type: 'number' },
    buckets: {
      type: 'array',
      items: BucketMetadataSchema
    }
  },
  required: ['events', 'importedAt', 'buckets']
};

// Insight schemas
const AffectedMetricSchema = {
  type: 'object',
  properties: {
    metric: { type: 'string' },
    effect: { type: 'string' } // "positive" or "negative"
  },
  required: ['metric', 'effect']
};

const InsightSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    affectedMetrics: {
      type: 'array',
      items: AffectedMetricSchema
    },
    notes: { type: 'string' },
    category: { type: 'string' },
    createdAt: { type: 'number' }
  },
  required: ['id', 'name', 'affectedMetrics', 'createdAt']
};

const InsightsCollectionSchema = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: InsightSchema
    }
  },
  required: ['insights']
};

// Pattern Note schemas
const PatternNoteSchema = {
  type: 'object',
  properties: {
    activity: { type: 'string' },
    notes: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' }
  },
  required: ['activity', 'notes', 'createdAt']
};

const PatternNotesCollectionSchema = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: PatternNoteSchema
    }
  },
  required: ['notes']
};

// Quick Note schemas (for homepage quick capture)
const QuickNoteSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    text: { type: ['string', 'null'] }, // Optional text content
    photoIds: { type: ['array', 'null'], items: { type: 'string' } }, // Optional photo IDs
    audioPath: { type: ['string', 'null'] }, // Optional path to audio file in RemoteStorage
    audioDuration: { type: ['number', 'null'] }, // Optional duration in seconds
    createdAt: { type: 'number' },
    updatedAt: { type: ['number', 'null'] } // Optional update timestamp
  },
  required: ['id', 'createdAt']
};

const QuickNotesCollectionSchema = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: QuickNoteSchema
    }
  },
  required: ['notes']
};

// Entity schemas
const EntitySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' }, // 'person', 'project', 'context', or null for untyped
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' }
  },
  required: ['id', 'name', 'createdAt']
};

const EntitiesCollectionSchema = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      items: EntitySchema
    }
  },
  required: ['entities']
};

// Mention schemas
const MentionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sourceType: { type: 'string' }, // 'impact', 'insight', 'task', 'habit', 'goal', etc.
    sourceId: { type: 'string' },
    entityId: { type: 'string' },
    context: { type: 'string' }, // Text snippet around the mention
    position: { type: 'number' }, // Character position in source text
    fieldName: { type: 'string' }, // Which field contains the mention (e.g., 'activity', 'notes')
    createdAt: { type: 'number' }
  },
  required: ['id', 'sourceType', 'sourceId', 'entityId', 'createdAt']
};

const MentionsCollectionSchema = {
   type: 'object',
   properties: {
      mentions: {
         type: 'array',
         items: MentionSchema
      }
   },
   required: ['mentions']
};

// Velocity tracking schemas
interface VelocityEntry {
   id: string;
   taskId: string;
   taskName: string;
   effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
   numericEstimate?: number;
   completedAt: number;
   period: string;
}

const VelocityEntrySchema = {
   type: 'object',
   properties: {
      id: { type: 'string' },
      taskId: { type: 'string' },
      taskName: { type: 'string' },
      effort: { type: 'string', enum: ['XS', 'S', 'M', 'L', 'XL'] },
      numericEstimate: { type: 'number' },
      completedAt: { type: 'number' },
      period: { type: 'string' } // e.g., '2024-W01' for week 1 of 2024, or '2024-01-15' for daily
   },
   required: ['id', 'taskId', 'taskName', 'completedAt']
};

const VelocityCollectionSchema = {
   type: 'object',
   properties: {
      entries: {
         type: 'array',
         items: VelocityEntrySchema
      }
   },
   required: ['entries']
};

export class RemoteStorageClient {
  private remoteStorage: any = null;
  private client: any = null;
  private todonnaClient: any = null;
  private widget: any = null;
  private initialized = false;

  constructor() {
    // Don't initialize during SSR
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.initialized || !RemoteStorage) return;

    // Initialize RemoteStorage with change events enabled
    this.remoteStorage = new RemoteStorage({
      changeEvents: {
        local: true,
        window: true,
        remote: true,
        conflicts: true
      }
    });

    this.remoteStorage.setApiKeys({
      dropbox: 'k4ydeln2lqgsfch',
    });

    // Claim access to the leptum namespace
    this.remoteStorage.access.claim('leptum', 'rw');

    // Create scoped client for Leptum data
    this.client = this.remoteStorage.scope('/leptum/');

    // Declare schemas
    this.setupSchemas();

    this.initialized = true;
  }

  private setupSchemas() {
    if (!this.client) return;

    this.client.declareType('Job', JobSchema);
    this.client.declareType('Goal', GoalSchema);
    this.client.declareType('GoalType', GoalTypeSchema);
    this.client.declareType('Impact', ImpactSchema);
    this.client.declareType('ImpactsCollection', ImpactsCollectionSchema);
    this.client.declareType('Stack', StackSchema);
    this.client.declareType('StandaloneTask', StandaloneTaskSchema);
    this.client.declareType('StandaloneTasksCollection', StandaloneTasksCollectionSchema);
    this.client.declareType('HomeTasksCollection', HomeTasksCollectionSchema);
    this.client.declareType('ArchivedBucket', ArchivedBucketSchema);
    this.client.declareType('ArchivedIndex', ArchivedIndexSchema);
    this.client.declareType('WeeklyGoal', WeeklyGoalSchema);
    this.client.declareType('Routine', RoutineSchema);
    this.client.declareType('RoutineCompletionsCollection', RoutineCompletionsCollectionSchema);
    this.client.declareType('ActivityWatchData', ActivityWatchDataSchema);
    this.client.declareType('Insight', InsightSchema);
    this.client.declareType('InsightsCollection', InsightsCollectionSchema);
    this.client.declareType('PatternNote', PatternNoteSchema);
    this.client.declareType('PatternNotesCollection', PatternNotesCollectionSchema);
    this.client.declareType('QuickNote', QuickNoteSchema);
    this.client.declareType('QuickNotesCollection', QuickNotesCollectionSchema);
    this.client.declareType('Entity', EntitySchema);
    this.client.declareType('EntitiesCollection', EntitiesCollectionSchema);
    this.client.declareType('Mention', MentionSchema);
    this.client.declareType('MentionsCollection', MentionsCollectionSchema);
    this.client.declareType('VelocityEntry', VelocityEntrySchema);
    this.client.declareType('VelocityCollection', VelocityCollectionSchema);
    this.client.declareType('PhotoAttachment', PhotoAttachmentSchema);
    this.client.declareType('PhotosCollection', PhotosCollectionSchema);
  }

  // Initialize and attach widget
  public attachWidget(containerId: string = 'remotestorage-widget') {
    if (typeof window === 'undefined' || !Widget || !this.remoteStorage) return;

    // Ensure RemoteStorage is initialized
    this.initialize();

    if (!this.initialized) return;

    // Don't attach if already attached
    if (this.widget) return;

    this.widget = new Widget(this.remoteStorage, {
      leaveOpen: true,
      autoCloseAfter: 0,
      skipInitial: false,
      logging: false,
      modalBackdrop: 'onlySmallScreens'
    });

    this.widget.attach(containerId);

    // Enable caching for all paths
    this.client.cache('');
  }

  // Detach widget (cleanup)
  public detachWidget() {
    if (this.widget) {
      // RemoteStorage widget doesn't have a direct detach method,
      // but we can set it to null and the DOM element will be cleaned up
      this.widget = null;
    }
  }

  // Job operations
  public async getJobs() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    
    try {
      const jobs = await this.client.getAll('jobs/') || {};
      return Object.values(jobs).filter(job => job);
    } catch (error) {
      console.error('Failed to get jobs:', error);
      return [];
    }
  }

  public async saveJob(job: any) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.storeObject('Job', `jobs/${job.id}`, job);
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  }

  public async deleteJob(jobId: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.remove(`jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  }

  // Goal operations  
  public async getGoals() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    
    try {
      const goals = await this.client.getAll('goals/') || {};
      return Object.values(goals).filter(goal => goal);
    } catch (error) {
      console.error('Failed to get goals:', error);
      return [];
    }
  }

  public async saveGoal(goal: any) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      // Filter out undefined values to avoid schema validation errors
      const cleanedGoal = Object.fromEntries(
        Object.entries(goal).filter(([_, value]) => value !== undefined)
      );
      
      return await this.client.storeObject('Goal', `goals/${goal.id}`, cleanedGoal);
    } catch (error) {
      console.error('Failed to save goal:', error);
      throw error;
    }
  }

  public async deleteGoal(goalId: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.remove(`goals/${goalId}`);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  }

  // Goal Type operations
  public async getGoalTypes() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    
    try {
      const goalTypes = await this.client.getAll('goal-types/') || {};
      return Object.values(goalTypes).filter(type => type);
    } catch (error) {
      console.error('Failed to get goal types:', error);
      return [];
    }
  }

  public async saveGoalType(goalType: any) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.storeObject('GoalType', `goal-types/${goalType.id}`, goalType);
    } catch (error) {
      console.error('Failed to save goal type:', error);
    }
  }

  // Impact operations
  public async getImpacts() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    
    try {
      const impacts = await this.client.getObject('impacts') || { impacts: [] };
      return impacts.impacts || [];
    } catch (error) {
      console.error('Failed to get impacts:', error);
      return [];
    }
  }

  public async saveImpacts(impacts: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.storeObject('ImpactsCollection', 'impacts', { impacts });
    } catch (error) {
      console.error('Failed to save impacts:', error);
    }
  }

  // Stack operations
  public async getStacks() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    
    try {
      const stacks = await this.client.getAll('stacks/') || {};
      return Object.values(stacks).filter(stack => stack);
    } catch (error) {
      console.error('Failed to get stacks:', error);
      return [];
    }
  }

  public async saveStack(stack: any, index: number) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.storeObject('Stack', `stacks/${index}`, stack);
    } catch (error) {
      console.error('Failed to save stack:', error);
    }
  }

  public async deleteStack(index: number) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.remove(`stacks/${index}`);
    } catch (error) {
      console.error('Failed to delete stack:', error);
    }
  }

  // Routine operations (unified Jobs + Stacks)
  public async getRoutines() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const routines = await this.client.getAll('routines/') || {};
      return Object.values(routines).filter(routine => routine);
    } catch (error) {
      console.error('Failed to get routines:', error);
      return [];
    }
  }

  /** Get a single routine by id (e.g. for Show Up) without loading all routines. */
  public async getRoutine(id: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      const routine = await this.client.getObject(`routines/${id}`);
      return routine ?? null;
    } catch (error) {
      console.error('Failed to get routine:', error);
      return null;
    }
  }

  public async saveRoutine(routine: any) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('Routine', `routines/${routine.id}`, routine);
    } catch (error) {
      console.error('Failed to save routine:', error);
    }
  }

  public async deleteRoutine(routineId: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) {
      throw new Error('RemoteStorage client not initialized');
    }

    try {
      return await this.client.remove(`routines/${routineId}`);
    } catch (error) {
      console.error('Failed to delete routine:', error);
      throw error;
    }
  }

  // Standalone Task operations
  public async getStandaloneTasks() {
    return this.getHomeTasks();
  }

  public async saveStandaloneTasks(tasks: any[], retries: number = 3): Promise<void> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.saveHomeTasks(tasks, retries);
      } catch (error: any) {
        // Handle 412 Precondition Failed (ETag conflict) by retrying with fresh data
        if (error.status === 412 && attempt < retries - 1) {
          console.warn(`Standalone tasks conflict (attempt ${attempt + 1}/${retries}), refreshing and retrying...`);
          // Get fresh data and merge
          const freshTasks = await this.getStandaloneTasks();
          // Merge: keep existing tasks, add new ones that don't exist
          const taskIds = new Set(freshTasks.map((t: any) => t.id));
          const mergedTasks = [...freshTasks];
          tasks.forEach((task: any) => {
            if (!taskIds.has(task.id)) {
              mergedTasks.push(task);
            }
          });
          tasks = mergedTasks;
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        // Handle "maximum debt" errors - wait longer and retry
        if (error.message && error.message.includes('debt') && attempt < retries - 1) {
          console.warn(`RemoteStorage debt limit reached (attempt ${attempt + 1}/${retries}), waiting longer before retry...`);
          // Wait longer for debt to clear (exponential backoff, longer delays)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
          continue;
        }
        console.error('Failed to save standalone tasks:', error);
        throw error;
      }
    }
  }

  public async addStandaloneTask(task: any) {
    const tasks = await this.getHomeTasks();
    tasks.push(task);
    return await this.saveHomeTasks(tasks);
  }

  public async updateStandaloneTask(taskId: string, updates: any, retries: number = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const tasks = await this.getHomeTasks();
        const index = tasks.findIndex((task: any) => task.id === taskId);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], ...updates };
          return await this.saveHomeTasks(tasks);
        }
        return;
      } catch (error: any) {
        if (error.status === 412 && attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw error;
      }
    }
  }

  public async deleteStandaloneTask(taskId: string, retries: number = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const tasks = await this.getHomeTasks();
        const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
        return await this.saveHomeTasks(filteredTasks);
      } catch (error: any) {
        if (error.status === 412 && attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw error;
      }
    }
  }

  // Home tasks: single file for homepage (non-archived only)
  private static readonly ARCHIVED_BUCKET_MAX = 250;

  public async getHomeTasks(): Promise<any[]> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    try {
      const result = await this.client.getObject('home-tasks') || { tasks: [] };
      return result.tasks || [];
    } catch (error) {
      console.error('Failed to get home tasks:', error);
      return [];
    }
  }

  public async saveHomeTasks(tasks: any[], retries: number = 3): Promise<void> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Clean undefined fields (e.g. optional effort/numericEstimate) to satisfy JSON schema
        const cleanedTasks = tasks.map((t: any) =>
          Object.fromEntries(Object.entries(t).filter(([_, v]) => v !== undefined))
        );
        return await this.client.storeObject('HomeTasksCollection', 'home-tasks', { tasks: cleanedTasks });
      } catch (error: any) {
        if (error.status === 412 && attempt < retries - 1) {
          const fresh = await this.getHomeTasks();
          const freshIds = new Set(fresh.map((t: any) => t.id));
          const merged = [...fresh];
          tasks.forEach((t: any) => {
            if (!freshIds.has(t.id)) merged.push(t);
          });
          tasks = merged;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw error;
      }
    }
  }

  public async getArchivedIndex(): Promise<{ bucketIds: string[] }> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return { bucketIds: [] };
    try {
      const result = await this.client.getObject('archived-tasks/_index') || { bucketIds: [] };
      return { bucketIds: result.bucketIds || [] };
    } catch (error) {
      console.error('Failed to get archived index:', error);
      return { bucketIds: [] };
    }
  }

  public async saveArchivedIndex(bucketIds: string[]): Promise<void> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    try {
      await this.client.storeObject('ArchivedIndex', 'archived-tasks/_index', { bucketIds });
    } catch (error) {
      console.error('Failed to save archived index:', error);
      throw error;
    }
  }

  public async getArchivedBucket(bucketId: string): Promise<{ tasks: any[]; createdAt: number } | null> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;
    try {
      const result = await this.client.getObject(`archived-tasks/${bucketId}`);
      if (!result) return null;
      return {
        tasks: result.tasks || [],
        createdAt: result.createdAt ?? parseInt(bucketId, 10)
      };
    } catch (error) {
      console.error('Failed to get archived bucket:', bucketId, error);
      return null;
    }
  }

  /** Append tasks to archived storage; creates new bucket if current one would exceed ARCHIVED_BUCKET_MAX. */
  public async appendArchivedTasks(tasksToArchive: any[]): Promise<void> {
    if (!tasksToArchive.length) return;
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    const { bucketIds } = await this.getArchivedIndex();
    const now = Date.now();
    let currentId = bucketIds.length > 0 ? bucketIds[bucketIds.length - 1] : null;
    let bucket = currentId ? await this.getArchivedBucket(currentId) : null;
    let remaining = [...tasksToArchive];

    while (remaining.length > 0) {
      const space = bucket ? RemoteStorageClient.ARCHIVED_BUCKET_MAX - bucket.tasks.length : RemoteStorageClient.ARCHIVED_BUCKET_MAX;
      const take = Math.min(space || RemoteStorageClient.ARCHIVED_BUCKET_MAX, remaining.length);
      const chunk = remaining.splice(0, take);
      if (chunk.length === 0) break;
      if (bucket && bucket.tasks.length + chunk.length <= RemoteStorageClient.ARCHIVED_BUCKET_MAX) {
        bucket.tasks.push(...chunk);
        await this.client.storeObject('ArchivedBucket', `archived-tasks/${currentId!}`, {
          tasks: bucket.tasks,
          createdAt: bucket.createdAt
        });
      } else {
        const newId = String(now + bucketIds.length * 1000);
        bucketIds.push(newId);
        bucket = {
          tasks: chunk,
          createdAt: now
        };
        await this.client.storeObject('ArchivedBucket', `archived-tasks/${newId}`, bucket);
        await this.saveArchivedIndex(bucketIds);
        currentId = newId;
      }
    }
  }

  /** Fetch only the latest archived bucket (for archive view). */
  public async getLatestArchivedBucket(): Promise<{ tasks: any[]; createdAt: number } | null> {
    const { bucketIds } = await this.getArchivedIndex();
    if (bucketIds.length === 0) return null;
    const latestId = bucketIds[bucketIds.length - 1];
    return this.getArchivedBucket(latestId);
  }

  /** One-time migration: split standalone-tasks into home-tasks + archived buckets. */
  public async migrateToHomeAndArchivedIfNeeded(): Promise<void> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    try {
      const existingHome = await this.client.getObject('home-tasks');
      if (existingHome != null) return; // Already migrated
      const legacy = await this.client.getObject('standalone-tasks') || { tasks: [] };
      const all = legacy.tasks || [];
      if (all.length === 0) {
        await this.client.storeObject('HomeTasksCollection', 'home-tasks', { tasks: [] });
        return;
      }
      const home = all.filter((t: any) => !t.archivedAt);
      const archived = all.filter((t: any) => t.archivedAt);
      await this.client.storeObject('HomeTasksCollection', 'home-tasks', { tasks: home });
      if (archived.length > 0) {
        await this.appendArchivedTasks(archived);
      }
    } catch (error) {
      console.error('Migration to home/archived failed:', error);
    }
  }

  // Routine Completion operations
  public async getRoutineCompletions() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('routine-completions') || { completions: [] };
      return result.completions || [];
    } catch (error) {
      console.error('Failed to get routine completions:', error);
      return [];
    }
  }

  public async saveRoutineCompletions(completions: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('RoutineCompletionsCollection', 'routine-completions', { completions });
    } catch (error) {
      console.error('Failed to save routine completions:', error);
    }
  }

  public async addRoutineCompletion(completion: any) {
    const completions = await this.getRoutineCompletions();
    completions.push(completion);
    return await this.saveRoutineCompletions(completions);
  }

  public async deleteRoutineCompletion(routineInstanceId: string) {
    const completions = await this.getRoutineCompletions();
    const filtered = completions.filter((c: any) => c.routineInstanceId !== routineInstanceId);
    return await this.saveRoutineCompletions(filtered);
  }

  // Todonna integration methods
  
  // Convert local task format to todonna format
  private taskToTodonna(task: any) {
    // Map status values
    let todonnaStatus = 'todo'; // default
    if (task.status === 'completed') {
      todonnaStatus = 'done';
    } else if (task.status === 'due') {
      todonnaStatus = 'todo';
    } else if (task.status === 'pending') {
      todonnaStatus = 'pending';
    }

    return {
      todo_item_text: task.name,
      todo_item_status: todonnaStatus,
      todo_item_id: task.id,
      date: new Date(task.createdAt).toISOString(),
      '@context': 'http://remotestorage.io/spec/modules/todonna/aTodoItem'
    };
  }

  // Convert todonna format to local task format
  private todonnaToTask(todonnaItem: any) {
    // Map status values back
    let localStatus = 'due'; // default
    if (todonnaItem.todo_item_status === 'done') {
      localStatus = 'completed';
    } else if (todonnaItem.todo_item_status === 'todo') {
      localStatus = 'due';
    } else if (todonnaItem.todo_item_status === 'pending') {
      localStatus = 'pending';
    }

    // Use Todonna's date field for createdAt when available, fallback to now
    let createdAt = Date.now();
    if (todonnaItem.date) {
      const parsed = Date.parse(todonnaItem.date);
      if (!Number.isNaN(parsed)) {
        createdAt = parsed;
      }
    }

    return {
      id: todonnaItem.todo_item_id,
      name: todonnaItem.todo_item_text,
      status: localStatus,
      createdAt,
      // Note: description and completedAt are not in todonna format
    };
  }

  // Get all todonna items (lazily initialize todonna client for read-only import)
  public async getTodonnaItems() {
    // Lazily create todonna client only when importing, to avoid fetching todonna scope on normal app load
    if (!this.todonnaClient) {
      if (!this.remoteStorage) {
        this.initialize();
      }
      if (!this.remoteStorage) return [];
      this.remoteStorage.access.claim('todonna', 'r');
      this.todonnaClient = this.remoteStorage.scope('/todonna/');
      this.todonnaClient.declareType('aTodoItem', TodonnaItemSchema);
    }
    try {
      const items = (await this.todonnaClient.getAll('')) || {};
      return Object.values(items).filter(item => item);
    } catch (error) {
      console.error('Failed to get todonna items:', error);
      return [];
    }
  }

  // Save a task to todonna format
  public async saveToTodonna(task: any) {
    if (!this.todonnaClient) {
      this.initialize();
    }
    if (!this.todonnaClient) return;
    
    try {
      const todonnaItem = this.taskToTodonna(task);
      return await this.todonnaClient.storeObject('aTodoItem', task.id, todonnaItem);
    } catch (error) {
      console.error('Failed to save to todonna:', error);
    }
  }

  // Delete a task from todonna
  public async deleteFromTodonna(taskId: string) {
    if (!this.todonnaClient) {
      this.initialize();
    }
    if (!this.todonnaClient) return;
    
    try {
      return await this.todonnaClient.remove(taskId);
    } catch (error) {
      console.error('Failed to delete from todonna:', error);
    }
  }

  // Sync all home tasks to todonna
  public async syncToTodonna() {
    const localTasks = await this.getHomeTasks();
    for (const task of localTasks) {
      await this.saveToTodonna(task);
    }
  }

  // Import tasks from todonna and merge with home tasks. Returns { importedCount, tasks } so caller can set state without refetch.
  public async importFromTodonna(): Promise<{ importedCount: number; tasks: any[] }> {
    try {
      const [todonnaItems, localTasks] = await Promise.all([
        this.getTodonnaItems(),
        this.getHomeTasks()
      ]);
      // Only import items that are not marked as done in Todonna
      const activeItems = todonnaItems.filter((item: any) => item.todo_item_status !== 'done');
      const importedTasks = activeItems.map((item: any) => this.todonnaToTask(item));
      const existingIds = new Set(localTasks.map((task: any) => task.id));
      const newTasks = importedTasks.filter((task: any) => !existingIds.has(task.id));
      if (newTasks.length > 0) {
        const allTasks = [...localTasks, ...newTasks];
        await this.saveHomeTasks(allTasks);
        return { importedCount: newTasks.length, tasks: allTasks };
      }
      return { importedCount: 0, tasks: localTasks };
    } catch (error) {
      console.error('Failed to import from todonna:', error);
      return { importedCount: 0, tasks: [] };
    }
  }

  // Bi-directional sync: combines import and export
  public async bidirectionalSync() {
    try {
      // First import any new todonna items
      const importedCount = await this.importFromTodonna();

      // Then sync all local tasks to todonna
      await this.syncToTodonna();

      return { importedCount };
    } catch (error) {
      console.error('Failed to perform bidirectional sync:', error);
      return { importedCount: 0 };
    }
  }

  // Weekly Goal operations
  public async getWeeklyGoal(weekStart: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      return await this.client.getObject(`weekly-goals/${weekStart}`);
    } catch (error) {
      console.error('Failed to get weekly goal:', error);
      return null;
    }
  }

  public async saveWeeklyGoal(weeklyGoal: any) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('WeeklyGoal', `weekly-goals/${weeklyGoal.weekStart}`, weeklyGoal);
    } catch (error) {
      console.error('Failed to save weekly goal:', error);
    }
  }

  public async getAllWeeklyGoals() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const weeklyGoals = await this.client.getAll('weekly-goals/') || {};
      return Object.values(weeklyGoals).filter(goal => goal);
    } catch (error) {
      console.error('Failed to get all weekly goals:', error);
      return [];
    }
  }

  // ActivityWatch operations
  public async getActivityWatchData() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      const data = await this.client.getObject('activity-watch-data');
      return data || null;
    } catch (error) {
      console.error('Failed to get ActivityWatch data:', error);
      return null;
    }
  }

  public async saveActivityWatchData(data: any) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('ActivityWatchData', 'activity-watch-data', data);
    } catch (error) {
      console.error('Failed to save ActivityWatch data:', error);
    }
  }

  public async clearActivityWatchData() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.remove('activity-watch-data');
    } catch (error) {
      console.error('Failed to clear ActivityWatch data:', error);
    }
  }

  public async getActivityWatchEventsInRange(start: number, end: number) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const data = await this.getActivityWatchData();
      if (!data || !data.events) return [];

      return data.events.filter((event: any) =>
        event.timestamp >= start && event.timestamp <= end
      );
    } catch (error) {
      console.error('Failed to get ActivityWatch events in range:', error);
      return [];
    }
  }

  // Insights operations
  public async getInsights() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('insights') || { insights: [] };
      return result.insights || [];
    } catch (error) {
      console.error('Failed to get insights:', error);
      return [];
    }
  }

  public async saveInsights(insights: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('InsightsCollection', 'insights', { insights });
    } catch (error) {
      console.error('Failed to save insights:', error);
    }
  }

  // Pattern Notes operations
  public async getPatternNotes() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('pattern-notes') || { notes: [] };
      return result.notes || [];
    } catch (error) {
      console.error('Failed to get pattern notes:', error);
      return [];
    }
  }

  public async savePatternNotes(notes: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('PatternNotesCollection', 'pattern-notes', { notes });
    } catch (error) {
      console.error('Failed to save pattern notes:', error);
    }
  }

  // Entity operations
  public async getEntities() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('entities') || { entities: [] };
      return result.entities || [];
    } catch (error) {
      console.error('Failed to get entities:', error);
      return [];
    }
  }

  public async saveEntities(entities: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('EntitiesCollection', 'entities', { entities });
    } catch (error) {
      console.error('Failed to save entities:', error);
    }
  }

  // Mention operations
  public async getMentions() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('mentions') || { mentions: [] };
      return result.mentions || [];
    } catch (error) {
      console.error('Failed to get mentions:', error);
      return [];
    }
  }

  public async saveMentions(mentions: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('MentionsCollection', 'mentions', { mentions });
    } catch (error) {
      console.error('Failed to save mentions:', error);
    }
  }

  // Photo operations
  public async getPhotos() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('photos') || { photos: [] };
      const photos = result.photos || [];
      return photos;
    } catch (error: any) {
      // 404 errors are expected when the photos collection doesn't exist yet
      if (error?.status === 404 || error?.toString?.().includes('404') || error?.missing) {
        console.warn('RemoteStorageClient.getPhotos() - 404 (collection does not exist yet)');
        return [];
      }
      console.error('Failed to get photos:', error);
      return [];
    }
  }

  public async savePhotos(photos: any[], retries: number = 3): Promise<void> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    // Clean up photos: convert undefined to null for optional fields to match schema
    const cleanedPhotos = photos.map(photo => ({
      ...photo,
      fullImagePath: photo.fullImagePath ?? null,
      width: photo.width ?? null,
      height: photo.height ?? null,
      caption: photo.caption ?? null,
    }));

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.client.storeObject('PhotosCollection', 'photos', { photos: cleanedPhotos });
      } catch (error: any) {
        // Handle 404 errors - these are expected when creating a new collection
        if (error?.status === 404 || error?.toString?.().includes('404') || error?.missing) {
          // On first attempt with 404, try again (collection will be created)
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
        }
        
        // Handle 412 Precondition Failed (ETag conflict) by retrying with fresh data
        if (error.status === 412 && attempt < retries - 1) {
          console.warn(`Photos conflict (attempt ${attempt + 1}/${retries}), refreshing and retrying...`);
          const freshPhotos = await this.getPhotos();
          // Merge: keep existing photos, add new ones that don't exist
          const photoIds = new Set(freshPhotos.map((p: any) => p.id));
          const mergedPhotos = [...freshPhotos];
          cleanedPhotos.forEach((photo: any) => {
            if (!photoIds.has(photo.id)) {
              mergedPhotos.push(photo);
            }
          });
          // Re-clean merged photos and update cleanedPhotos for next iteration
          const reCleanedPhotos = mergedPhotos.map(photo => ({
            ...photo,
            fullImagePath: photo.fullImagePath ?? null,
            width: photo.width ?? null,
            height: photo.height ?? null,
            caption: photo.caption ?? null,
          }));
          // Update cleanedPhotos array for next iteration
          cleanedPhotos.length = 0;
          cleanedPhotos.push(...reCleanedPhotos);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        
        // Handle "maximum debt" errors - wait longer and retry
        if (error.message && error.message.includes('debt') && attempt < retries - 1) {
          console.warn(`RemoteStorage debt limit reached (attempt ${attempt + 1}/${retries}), waiting longer before retry...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
          continue;
        }
        
        // Log other errors
        if (!(error?.status === 404 || error?.toString?.().includes('404') || error?.missing)) {
          console.error('Failed to save photos:', error);
        }
        throw error;
      }
    }
  }

  public async addPhoto(photo: any) {
    const photos = await this.getPhotos();
    photos.push(photo);
    const result = await this.savePhotos(photos);
    return result;
  }

  public async getPhotosForImpact(impactId: string) {
    const photos = await this.getPhotos();
    return photos.filter((photo: any) => photo.impactId === impactId);
  }

  public async deletePhoto(photoId: string) {
    const photos = await this.getPhotos();
    const filteredPhotos = photos.filter((photo: any) => photo.id !== photoId);

    // Also delete the full image file if it exists
    const photoToDelete = photos.find((photo: any) => photo.id === photoId);
    if (photoToDelete?.fullImagePath) {
      try {
        await this.client.remove(photoToDelete.fullImagePath);
      } catch (error) {
        console.error('Failed to delete full image:', error);
      }
    }

    return await this.savePhotos(filteredPhotos);
  }

  public async deletePhotosForImpact(impactId: string) {
    const photos = await this.getPhotos();
    const photosToDelete = photos.filter((photo: any) => photo.impactId === impactId);

    // Delete all full image files
    for (const photo of photosToDelete) {
      if (photo.fullImagePath) {
        try {
          await this.client.remove(photo.fullImagePath);
        } catch (error) {
          console.error('Failed to delete full image:', error);
        }
      }
    }

    const filteredPhotos = photos.filter((photo: any) => photo.impactId !== impactId);
    return await this.savePhotos(filteredPhotos);
  }

  // Quick Note operations
  public async getQuickNotes() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('quick-notes') || { notes: [] };
      return result.notes || [];
    } catch (error: any) {
      if (error?.status === 404 || error?.toString?.().includes('404') || error?.missing) {
        return [];
      }
      console.error('Failed to get quick notes:', error);
      return [];
    }
  }

  public async saveQuickNotes(notes: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      // Clean up notes: convert undefined to null for optional fields to match schema
      const cleanedNotes = notes.map(note => ({
        ...note,
        text: note.text ?? null,
        photoIds: note.photoIds ?? null,
        audioPath: note.audioPath ?? null,
        audioDuration: note.audioDuration ?? null,
        updatedAt: note.updatedAt ?? null,
      }));
      
      return await this.client.storeObject('QuickNotesCollection', 'quick-notes', { notes: cleanedNotes });
      
      return await this.client.storeObject('QuickNotesCollection', 'quick-notes', { notes: cleanedNotes });
    } catch (error) {
      console.error('Failed to save quick notes:', error);
      throw error;
    }
  }

  public async addQuickNote(note: any) {
    const notes = await this.getQuickNotes();
    notes.push(note);
    return await this.saveQuickNotes(notes);
  }

  public async updateQuickNote(noteId: string, updates: any) {
    const notes = await this.getQuickNotes();
    const index = notes.findIndex((note: any) => note.id === noteId);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates, updatedAt: Date.now() };
      return await this.saveQuickNotes(notes);
    }
  }

  public async deleteQuickNote(noteId: string) {
    const notes = await this.getQuickNotes();
    const filteredNotes = notes.filter((note: any) => note.id !== noteId);
    
    // Also delete associated audio file if it exists
    const noteToDelete = notes.find((note: any) => note.id === noteId);
    if (noteToDelete?.audioPath) {
      try {
        await this.client.remove(noteToDelete.audioPath);
      } catch (error) {
        console.error('Failed to delete audio file:', error);
      }
    }
    
    return await this.saveQuickNotes(filteredNotes);
  }

  public async saveQuickNoteAudio(noteId: string, audioBlob: Blob): Promise<string | null> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      const path = `quick-note-audio/${noteId}`;
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      await this.client.storeFile(audioBlob.type, path, base64);
      return path;
    } catch (error) {
      console.error('Failed to save quick note audio:', error);
      return null;
    }
  }

  public async getQuickNoteAudio(path: string): Promise<Blob | null> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      const file = await this.client.getFile(path);
      if (file?.data) {
        // Convert base64 to blob
        const response = await fetch(file.data);
        return await response.blob();
      }
      return null;
    } catch (error) {
      console.error('Failed to get quick note audio:', error);
      return null;
    }
  }

  // Velocity tracking operations
  public async getVelocityEntries(): Promise<VelocityEntry[]> {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];

    try {
      const result = await this.client.getObject('velocity') || { entries: [] };
      return result.entries || [];
    } catch (error) {
      console.error('Failed to get velocity entries:', error);
      return [];
    }
  }

  public async saveVelocityEntries(entries: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    try {
      return await this.client.storeObject('VelocityCollection', 'velocity', { entries });
    } catch (error) {
      console.error('Failed to save velocity entries:', error);
    }
  }

  public async addVelocityEntry(entry: VelocityEntry) {
    const entries = await this.getVelocityEntries();
    entries.push(entry);
    return await this.saveVelocityEntries(entries);
  }

  public async recordTaskCompletionForVelocity(task: any) {
    if (!task.effort && !task.numericEstimate) return;

    const entry = {
      id: `velocity-${task.id}-${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      effort: task.effort,
      numericEstimate: task.numericEstimate,
      completedAt: task.completedAt,
      period: this.getPeriodFromDate(task.completedAt)
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

  public async saveFullImage(photoId: string, base64Data: string, mimeType: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      const path = `photo-images/${photoId}`;
      // Store as binary data
      await this.client.storeFile(mimeType, path, base64Data);
      return path;
    } catch (error) {
      console.error('Failed to save full image:', error);
      return null;
    }
  }

  public async getFullImage(path: string) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return null;

    try {
      const file = await this.client.getFile(path);
      return file;
    } catch (error) {
      console.error('Failed to get full image:', error);
      return null;
    }
  }

  // Event listening
  public onChange(callback: (event: any) => void) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;

    this.client.on('change', callback);
  }

  public onConnect(callback: () => void) {
    if (!this.remoteStorage) {
      this.initialize();
    }
    if (!this.remoteStorage) return;
    
    this.remoteStorage.on('connected', callback);
  }

  public onDisconnect(callback: () => void) {
    if (!this.remoteStorage) {
      this.initialize();
    }
    if (!this.remoteStorage) return;

    this.remoteStorage.on('disconnected', callback);
  }

  public onError(callback: (error: Error) => void) {
    if (!this.remoteStorage) {
      this.initialize();
    }
    if (!this.remoteStorage) return;

    this.remoteStorage.on('error', callback);
  }

  public offError(callback: (error: Error) => void) {
    if (!this.remoteStorage) return;

    // RemoteStorage uses '_handlers' internally; we need to remove the listener
    const handlers = this.remoteStorage._handlers?.error;
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Utility methods
  public isConnected() {
    if (!this.remoteStorage) {
      this.initialize();
    }
    return this.remoteStorage?.connected || false;
  }

  public getRemoteStorage() {
    if (!this.remoteStorage) {
      this.initialize();
    }
    return this.remoteStorage;
  }
}

// Create singleton instance
export const remoteStorageClient = new RemoteStorageClient(); 