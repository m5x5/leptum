import type { ShapeType } from "@ldo/ldo";
import { locationSchema } from "./location.schema";
import { locationContext } from "./location.context";
import type { Location } from "./location.typings";

/**
 * =============================================================================
 * LDO ShapeTypes location
 * =============================================================================
 */

/**
 * Location ShapeType
 */
export const LocationShapeType: ShapeType<Location> = {
  schema: locationSchema,
  shape: "https://mpeters.dev/ns/leptum#LocationShape",
  context: locationContext,
};
