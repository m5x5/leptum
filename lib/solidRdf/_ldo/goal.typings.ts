import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for goal
 * =============================================================================
 */

/**
 * Goal Type
 */
export interface Goal {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<
    | {
        "@id": "Action";
      }
    | {
        "@id": "Goal";
      }
  >;
  name?: string;
  description?: string;
  color?: string;
  additionalType?: {
    "@id": string;
  };
  actionStatus?:
    | {
        "@id": "CompletedActionStatus";
      }
    | {
        "@id": "ActiveActionStatus";
      }
    | {
        "@id": "PotentialActionStatus";
      }
    | {
        "@id": "FailedActionStatus";
      };
  endTime?: string;
  created?: string;
  completedAt?: string;
  milestone?: LdSet<Milestone>;
  trackingConfig?: TrackingConfig;
  trackingEntry?: LdSet<TrackingEntry>;
}

/**
 * Milestone Type
 */
export interface Milestone {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  name?: string;
  endTime?: string;
  actionStatus?:
    | {
        "@id": "CompletedActionStatus";
      }
    | {
        "@id": "PotentialActionStatus";
      };
  completedAt?: string;
  order?: number;
}

/**
 * TrackingConfig Type
 */
export interface TrackingConfig {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  trackingType?: string;
  unit?: string;
  icon?: string;
  dailyTarget?: number;
  maxPerDay?: number;
  increments?: LdSet<number>;
  options?: LdSet<string>;
}

/**
 * TrackingEntry Type
 */
export interface TrackingEntry {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  date?: string;
  value?: number;
  completed?: boolean;
  notes?: string;
  timestamp?: string;
}
