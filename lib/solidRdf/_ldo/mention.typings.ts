import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for mention
 * =============================================================================
 */

/**
 * Mention Type
 */
export interface Mention {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "Annotation";
  }>;
  hasTarget?: {
    "@id": string;
  };
  hasBody?: {
    "@id": string;
  };
  fieldName?: string;
  context?: string;
  position?: number;
  created?: string;
}
