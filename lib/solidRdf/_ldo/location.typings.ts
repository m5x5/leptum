import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for location
 * =============================================================================
 */

/**
 * Location Type
 */
export interface Location {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "GeoCoordinates";
  }>;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  created?: string;
}
