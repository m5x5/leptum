import type { ShapeType } from "@ldo/ldo";
import { entitySchema } from "./entity.schema";
import { entityContext } from "./entity.context";
import type { Entity } from "./entity.typings";

/**
 * =============================================================================
 * LDO ShapeTypes entity
 * =============================================================================
 */

/**
 * Entity ShapeType
 */
export const EntityShapeType: ShapeType<Entity> = {
  schema: entitySchema,
  shape: "https://mpeters.dev/ns/leptum#EntityShape",
  context: entityContext,
};
