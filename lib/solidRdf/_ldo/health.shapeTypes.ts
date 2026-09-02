import type { ShapeType } from "@ldo/ldo";
import { healthSchema } from "./health.schema";
import { healthContext } from "./health.context";
import type {
  DailyHealthMetrics,
  ExerciseSession,
  SleepSession,
} from "./health.typings";

/**
 * =============================================================================
 * LDO ShapeTypes health
 * =============================================================================
 */

/**
 * DailyHealthMetrics ShapeType
 */
export const DailyHealthMetricsShapeType: ShapeType<DailyHealthMetrics> = {
  schema: healthSchema,
  shape: "https://mpeters.dev/ns/leptum#DailyHealthMetricsShape",
  context: healthContext,
};

/**
 * ExerciseSession ShapeType
 */
export const ExerciseSessionShapeType: ShapeType<ExerciseSession> = {
  schema: healthSchema,
  shape: "https://mpeters.dev/ns/leptum#ExerciseSessionShape",
  context: healthContext,
};

/**
 * SleepSession ShapeType
 */
export const SleepSessionShapeType: ShapeType<SleepSession> = {
  schema: healthSchema,
  shape: "https://mpeters.dev/ns/leptum#SleepSessionShape",
  context: healthContext,
};
