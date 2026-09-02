import type { ShapeType } from "@ldo/ldo";
import { insightSchema } from "./insight.schema";
import { insightContext } from "./insight.context";
import type { Insight, AffectedMetric } from "./insight.typings";

/**
 * =============================================================================
 * LDO ShapeTypes insight
 * =============================================================================
 */

/**
 * Insight ShapeType
 */
export const InsightShapeType: ShapeType<Insight> = {
  schema: insightSchema,
  shape: "https://mpeters.dev/ns/leptum#InsightShape",
  context: insightContext,
};

/**
 * AffectedMetric ShapeType
 */
export const AffectedMetricShapeType: ShapeType<AffectedMetric> = {
  schema: insightSchema,
  shape: "https://mpeters.dev/ns/leptum#AffectedMetricShape",
  context: insightContext,
};
