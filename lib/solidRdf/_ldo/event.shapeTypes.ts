import type { ShapeType } from "@ldo/ldo";
import { eventSchema } from "./event.schema";
import { eventContext } from "./event.context";
import type { Event } from "./event.typings";

/**
 * =============================================================================
 * LDO ShapeTypes event
 * =============================================================================
 */

/**
 * Event ShapeType
 */
export const EventShapeType: ShapeType<Event> = {
  schema: eventSchema,
  shape: "https://mpeters.dev/ns/leptum#EventShape",
  context: eventContext,
};
