import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for routineCompletion
 * =============================================================================
 */

/**
 * RoutineCompletion Type
 */
export interface RoutineCompletion {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "CompleteAction";
  }>;
  object?: {
    "@id": string;
  };
  name?: string;
  endTime?: string;
  routineInstanceId?: string;
  taskCount?: number;
}
