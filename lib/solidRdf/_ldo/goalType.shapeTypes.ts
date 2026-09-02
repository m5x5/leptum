import type { ShapeType } from "@ldo/ldo";
import { goalTypeSchema } from "./goalType.schema";
import { goalTypeContext } from "./goalType.context";
import type { GoalType } from "./goalType.typings";

/**
 * =============================================================================
 * LDO ShapeTypes goalType
 * =============================================================================
 */

/**
 * GoalType ShapeType
 */
export const GoalTypeShapeType: ShapeType<GoalType> = {
  schema: goalTypeSchema,
  shape: "https://mpeters.dev/ns/leptum#GoalTypeShape",
  context: goalTypeContext,
};
