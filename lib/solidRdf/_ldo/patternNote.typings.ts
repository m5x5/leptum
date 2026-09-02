import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for patternNote
 * =============================================================================
 */

/**
 * PatternNote Type
 */
export interface PatternNote {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "PatternNote";
  }>;
  activity?: string;
  content?: string;
  created?: string;
  modified?: string;
}
