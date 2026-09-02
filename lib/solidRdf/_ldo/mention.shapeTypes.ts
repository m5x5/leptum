import type { ShapeType } from "@ldo/ldo";
import { mentionSchema } from "./mention.schema";
import { mentionContext } from "./mention.context";
import type { Mention } from "./mention.typings";

/**
 * =============================================================================
 * LDO ShapeTypes mention
 * =============================================================================
 */

/**
 * Mention ShapeType
 */
export const MentionShapeType: ShapeType<Mention> = {
  schema: mentionSchema,
  shape: "https://mpeters.dev/ns/leptum#MentionShape",
  context: mentionContext,
};
