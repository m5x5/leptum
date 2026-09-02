import type { ShapeType } from "@ldo/ldo";
import { noteSchema } from "./note.schema";
import { noteContext } from "./note.context";
import type { Note, NoteAudio } from "./note.typings";

/**
 * =============================================================================
 * LDO ShapeTypes note
 * =============================================================================
 */

/**
 * Note ShapeType
 */
export const NoteShapeType: ShapeType<Note> = {
  schema: noteSchema,
  shape: "https://mpeters.dev/ns/leptum#NoteShape",
  context: noteContext,
};

/**
 * NoteAudio ShapeType
 */
export const NoteAudioShapeType: ShapeType<NoteAudio> = {
  schema: noteSchema,
  shape: "https://mpeters.dev/ns/leptum#NoteAudioShape",
  context: noteContext,
};
