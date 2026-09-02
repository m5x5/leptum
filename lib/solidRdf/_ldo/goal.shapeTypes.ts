import type { ShapeType } from "@ldo/ldo";
import { goalSchema } from "./goal.schema";
import { goalContext } from "./goal.context";
import type {
  Goal,
  Milestone,
  TrackingConfig,
  TrackingEntry,
} from "./goal.typings";

/**
 * =============================================================================
 * LDO ShapeTypes goal
 * =============================================================================
 */

/**
 * Goal ShapeType
 */
export const GoalShapeType: ShapeType<Goal> = {
  schema: goalSchema,
  shape: "https://mpeters.dev/ns/leptum#GoalShape",
  context: goalContext,
};

/**
 * Milestone ShapeType
 */
export const MilestoneShapeType: ShapeType<Milestone> = {
  schema: goalSchema,
  shape: "https://mpeters.dev/ns/leptum#MilestoneShape",
  context: goalContext,
};

/**
 * TrackingConfig ShapeType
 */
export const TrackingConfigShapeType: ShapeType<TrackingConfig> = {
  schema: goalSchema,
  shape: "https://mpeters.dev/ns/leptum#TrackingConfigShape",
  context: goalContext,
};

/**
 * TrackingEntry ShapeType
 */
export const TrackingEntryShapeType: ShapeType<TrackingEntry> = {
  schema: goalSchema,
  shape: "https://mpeters.dev/ns/leptum#TrackingEntryShape",
  context: goalContext,
};
