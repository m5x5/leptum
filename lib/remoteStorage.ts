// Dynamic imports to avoid SSR issues
let RemoteStorage: any;
let Widget: any;

if (typeof window !== 'undefined') {
  RemoteStorage = require('remotestoragejs');
  Widget = require('remotestorage-widget');
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

const GoalSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' }
  },
  required: ['id', 'name', 'type']
};

const GoalTypeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' }
  },
  required: ['id', 'name', 'description']
};

const ImpactSchema = {
  type: 'object',
  properties: {
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
    notes: { type: 'string' }
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
    goalId: { type: 'string' }
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
    goalId: { type: 'string' }, // Optional - associated goal
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
    
    // Claim access to todonna namespace for integration
    this.remoteStorage.access.claim('todonna', 'rw');
    
    // Create scoped client
    this.client = this.remoteStorage.scope('/leptum/');
    
    // Create todonna client
    this.todonnaClient = this.remoteStorage.scope('/todonna/');

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
    this.client.declareType('WeeklyGoal', WeeklyGoalSchema);
    this.client.declareType('Routine', RoutineSchema);
    this.client.declareType('RoutineCompletionsCollection', RoutineCompletionsCollectionSchema);
    this.client.declareType('ActivityWatchData', ActivityWatchDataSchema);

    // Setup todonna schema
    if (this.todonnaClient) {
      this.todonnaClient.declareType('aTodoItem', TodonnaItemSchema);
    }
  }

  // Initialize and attach widget
  public attachWidget(containerId: string = 'remotestorage-widget') {
    if (typeof window === 'undefined' || !Widget || !this.remoteStorage) return;
    
    // Ensure RemoteStorage is initialized
    this.initialize();
    
    if (!this.initialized) return;

    this.widget = new Widget(this.remoteStorage, {
      leaveOpen: false,
      autoCloseAfter: 1500,
      skipInitial: false,
      logging: false,
      modalBackdrop: 'onlySmallScreens'
    });
    
    this.widget.attach(containerId);
    
    // Enable caching for all paths
    this.client.cache('');
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
      return await this.client.storeObject('Goal', `goals/${goal.id}`, goal);
    } catch (error) {
      console.error('Failed to save goal:', error);
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
    if (!this.client) return;

    try {
      return await this.client.remove(`routines/${routineId}`);
    } catch (error) {
      console.error('Failed to delete routine:', error);
    }
  }

  // Standalone Task operations
  public async getStandaloneTasks() {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return [];
    
    try {
      const result = await this.client.getObject('standalone-tasks') || { tasks: [] };
      return result.tasks || [];
    } catch (error) {
      console.error('Failed to get standalone tasks:', error);
      return [];
    }
  }

  public async saveStandaloneTasks(tasks: any[]) {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) return;
    
    try {
      return await this.client.storeObject('StandaloneTasksCollection', 'standalone-tasks', { tasks });
    } catch (error) {
      console.error('Failed to save standalone tasks:', error);
    }
  }

  public async addStandaloneTask(task: any) {
    const tasks = await this.getStandaloneTasks();
    tasks.push(task);
    return await this.saveStandaloneTasks(tasks);
  }

  public async updateStandaloneTask(taskId: string, updates: any) {
    const tasks = await this.getStandaloneTasks();
    const index = tasks.findIndex((task: any) => task.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      return await this.saveStandaloneTasks(tasks);
    }
  }

  public async deleteStandaloneTask(taskId: string) {
    const tasks = await this.getStandaloneTasks();
    const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
    return await this.saveStandaloneTasks(filteredTasks);
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

    return {
      id: todonnaItem.todo_item_id,
      name: todonnaItem.todo_item_text,
      status: localStatus,
      createdAt: Date.now(), // We don't have this from todonna, so use current time
      // Note: description and completedAt are not in todonna format
    };
  }

  // Get all todonna items
  public async getTodonnaItems() {
    if (!this.todonnaClient) {
      this.initialize();
    }
    if (!this.todonnaClient) return [];
    
    try {
      const items = await this.todonnaClient.getAll('') || {};
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

  // Sync all standalone tasks to todonna
  public async syncToTodonna() {
    const localTasks = await this.getStandaloneTasks();
    
    for (const task of localTasks) {
      await this.saveToTodonna(task);
    }
  }

  // Import tasks from todonna and merge with local tasks
  public async importFromTodonna() {
    try {
      const todonnaItems = await this.getTodonnaItems();
      const localTasks = await this.getStandaloneTasks();
      
      // Convert todonna items to local format
      const importedTasks = todonnaItems.map(item => this.todonnaToTask(item));
      
      // Merge with local tasks (avoid duplicates by ID)
      const existingIds = new Set(localTasks.map((task: any) => task.id));
      const newTasks = importedTasks.filter(task => !existingIds.has(task.id));
      
      if (newTasks.length > 0) {
        const allTasks = [...localTasks, ...newTasks];
        await this.saveStandaloneTasks(allTasks);
        return newTasks.length;
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to import from todonna:', error);
      return 0;
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