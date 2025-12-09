export interface Welcome {
    buckets: { [key: string]: Bucket };
}

export interface Bucket {
    id:       string;
    created:  Date;
    name:     null;
    type:     string;
    client:   string;
    hostname: string;
    data:     BucketData;
    events:   Event[];
}

export interface BucketData {
}

export interface Event {
    timestamp: Date;
    duration:  number;
    data:      EventData;
}

export interface EventData {
    status?:        Status;
    file?:          string;
    project?:       string;
    language?:      string;
    projectPath?:   string;
    editor?:        string;
    editorVersion?: string;
    eventType?:     string;
    url?:           string;
    title?:         string;
    audible?:       boolean;
    incognito?:     boolean;
    tabCount?:      number;
    app?:           string;
}

export enum Status {
    Afk = "afk",
    NotAfk = "not-afk",
}

// Processed ActivityWatch event for timeline display
export interface ProcessedAWEvent {
    id: string;
    bucketId: string;
    bucketType: string;
    timestamp: number;
    duration: number;
    displayName: string;
    eventData: EventData;
    color: string;
    isHidden?: boolean;
}

// Container for all ActivityWatch data stored in RemoteStorage
export interface ActivityWatchData {
    events: ProcessedAWEvent[];
    importedAt: number;
    buckets: BucketMetadata[];
}

// Metadata about imported buckets
export interface BucketMetadata {
    id: string;
    type: string;
    eventCount: number;
    dateRange: {
        start: number;
        end: number;
    };
    isVisible: boolean;
}

// Grouped events for visual display
export interface EventGroup {
    displayName: string;
    color: string;
    occurrences: ProcessedAWEvent[];
    totalDuration: number;
    timeRange: {
        start: number;
        end: number;
    };
    isExpanded?: boolean;
}

// Union type for timeline entries
export type TimelineEntryType = 'manual' | 'activity-watch' | 'group';

export interface TimelineEntry {
    type: TimelineEntryType;
    timestamp: number;
    duration: number;
    data: any;
}