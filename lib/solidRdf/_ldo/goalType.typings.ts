import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for goalType
 * =============================================================================
 */

/**
 * GoalType Type
 */
export interface GoalType {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "GoalType";
  }>;
  name?: string;
  description?: string;
}
