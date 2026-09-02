import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for image
 * =============================================================================
 */

/**
 * PhotoAttachment Type
 */
export interface PhotoAttachment {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "ImageObject";
  }>;
  aboutImpact?: {
    "@id": string;
  };
  contentUrl?: {
    "@id": string;
  };
  encodingFormat?: string;
  width?: number;
  height?: number;
  caption?: string;
  created?: string;
}
