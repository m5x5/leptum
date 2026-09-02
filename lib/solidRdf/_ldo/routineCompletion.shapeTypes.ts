import type { ShapeType } from "@ldo/ldo";
import { routineCompletionSchema } from "./routineCompletion.schema";
import { routineCompletionContext } from "./routineCompletion.context";
import type { RoutineCompletion } from "./routineCompletion.typings";

/**
 * =============================================================================
 * LDO ShapeTypes routineCompletion
 * =============================================================================
 */

/**
 * RoutineCompletion ShapeType
 */
export const RoutineCompletionShapeType: ShapeType<RoutineCompletion> = {
  schema: routineCompletionSchema,
  shape: "https://mpeters.dev/ns/leptum#RoutineCompletionShape",
  context: routineCompletionContext,
};
