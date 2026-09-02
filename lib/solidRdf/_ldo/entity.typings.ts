import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for entity
 * =============================================================================
 */

/**
 * Entity Type
 */
export interface Entity {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<
    | {
        "@id": "Person";
      }
    | {
        "@id": "Project";
      }
    | {
        "@id": "Context";
      }
  >;
  name?: string;
  name2?: string;
  description?: string;
  tag?: LdSet<string>;
  created?: string;
}
