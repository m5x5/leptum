import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for note
 * =============================================================================
 */

/**
 * Note Type
 */
export interface Note {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "Note";
  }>;
  content?: string;
  published?: string;
  updated?: string;
  attachment?: LdSet<{
    "@id": string;
  }>;
  audio?: NoteAudio;
  weekStart?: string;
}

/**
 * NoteAudio Type
 */
export interface NoteAudio {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type?: LdSet<{
    "@id": "AudioObject";
  }>;
  contentUrl?: {
    "@id": string;
  };
  duration?: number;
}
