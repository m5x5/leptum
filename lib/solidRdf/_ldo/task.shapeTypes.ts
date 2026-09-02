import type { ShapeType } from "@ldo/ldo";
import { taskSchema } from "./task.schema";
import { taskContext } from "./task.context";
import type { Task, GeoCoordinates } from "./task.typings";

/**
 * =============================================================================
 * LDO ShapeTypes task
 * =============================================================================
 */

/**
 * Task ShapeType
 */
export const TaskShapeType: ShapeType<Task> = {
  schema: taskSchema,
  shape: "https://mpeters.dev/ns/leptum#TaskShape",
  context: taskContext,
};

/**
 * GeoCoordinates ShapeType
 */
export const GeoCoordinatesShapeType: ShapeType<GeoCoordinates> = {
  schema: taskSchema,
  shape: "https://mpeters.dev/ns/leptum#GeoCoordinatesShape",
  context: taskContext,
};
