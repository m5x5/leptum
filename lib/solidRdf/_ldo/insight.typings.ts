import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for insight
 * =============================================================================
 */

/**
 * Insight Type
 */
export interface Insight {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "Insight";
  }>;
  name?: string;
  description?: string;
  category?: string;
  affectedMetric?: LdSet<AffectedMetric>;
  created?: string;
}

/**
 * AffectedMetric Type
 */
export interface AffectedMetric {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  metric?: string;
  effect?: string;
}
