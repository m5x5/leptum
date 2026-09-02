import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for task
 * =============================================================================
 */

/**
 * Task Type
 */
export interface Task {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<
    | {
        "@id": "Action";
      }
    | {
        "@id": "Vtodo";
      }
  >;
  rrule?: string;
  name?: string;
  summary?: string;
  description?: string;
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
  created?: string;
  createdAt?: string;
  completedAt?: string;
  archivedAt?: string;
  about?: LdSet<{
    "@id": string;
  }>;
  partOfRoutine?: {
    "@id": string;
  };
  routineInstanceId?: string;
  effort?: string;
  numericEstimate?: number;
  emotions?: LdSet<string>;
  geo?: GeoCoordinates;
  indoorX?: number;
  indoorY?: number;
  sortIndex?: number;
}

/**
 * GeoCoordinates Type
 */
export interface GeoCoordinates {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type?: LdSet<{
    "@id": "GeoCoordinates";
  }>;
  latitude: number;
  longitude: number;
}
