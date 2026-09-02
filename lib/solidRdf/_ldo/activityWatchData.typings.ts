import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for activityWatchData
 * =============================================================================
 */

/**
 * ActivityWatchData Type
 */
export interface ActivityWatchData {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "ActivityWatchData";
  }>;
  importedAt?: string;
  event?: LdSet<AWEvent>;
  bucket?: LdSet<BucketMetadata>;
}

/**
 * AWEvent Type
 */
export interface AWEvent {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  id?: string;
  bucketId?: string;
  bucketType?: string;
  timestamp?: string;
  duration?: number;
  displayName?: string;
  color?: string;
  isHidden?: boolean;
  status?: string;
  file?: string;
  project?: string;
  language?: string;
  projectPath?: string;
  editor?: string;
  editorVersion?: string;
  eventType?: string;
  url?: string;
  title?: string;
  audible?: boolean;
  incognito?: boolean;
  tabCount?: number;
  app?: string;
}

/**
 * BucketMetadata Type
 */
export interface BucketMetadata {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  id?: string;
  bucketType?: string;
  eventCount?: number;
  rangeStart?: string;
  rangeEnd?: string;
  isVisible?: boolean;
}
