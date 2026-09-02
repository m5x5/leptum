import type { ShapeType } from "@ldo/ldo";
import { velocityEntrySchema } from "./velocityEntry.schema";
import { velocityEntryContext } from "./velocityEntry.context";
import type { VelocityEntry } from "./velocityEntry.typings";

/**
 * =============================================================================
 * LDO ShapeTypes velocityEntry
 * =============================================================================
 */

/**
 * VelocityEntry ShapeType
 */
export const VelocityEntryShapeType: ShapeType<VelocityEntry> = {
  schema: velocityEntrySchema,
  shape: "https://mpeters.dev/ns/leptum#VelocityEntryShape",
  context: velocityEntryContext,
};
