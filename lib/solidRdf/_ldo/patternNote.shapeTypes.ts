import type { ShapeType } from "@ldo/ldo";
import { patternNoteSchema } from "./patternNote.schema";
import { patternNoteContext } from "./patternNote.context";
import type { PatternNote } from "./patternNote.typings";

/**
 * =============================================================================
 * LDO ShapeTypes patternNote
 * =============================================================================
 */

/**
 * PatternNote ShapeType
 */
export const PatternNoteShapeType: ShapeType<PatternNote> = {
  schema: patternNoteSchema,
  shape: "https://mpeters.dev/ns/leptum#PatternNoteShape",
  context: patternNoteContext,
};
