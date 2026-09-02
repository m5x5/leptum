import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for velocityEntry
 * =============================================================================
 */

/**
 * VelocityEntry Type
 */
export interface VelocityEntry {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "VelocityEntry";
  }>;
  about?: {
    "@id": string;
  };
  name?: string;
  endTime?: string;
  effort?: string;
  numericEstimate?: number;
  period?: string;
}
