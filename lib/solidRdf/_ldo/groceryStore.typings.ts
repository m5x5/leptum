import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for groceryStore
 * =============================================================================
 */

/**
 * GroceryStore Type
 */
export interface GroceryStore {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "GroceryStore";
  }>;
  name?: string;
  address?: string;
  openingHours?: string;
  geo?: GroceryStoreGeo;
}

/**
 * GroceryStoreGeo Type
 */
export interface GroceryStoreGeo {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type?: LdSet<{
    "@id": "GeoCoordinates";
  }>;
  latitude: number;
  longitude: number;
}
