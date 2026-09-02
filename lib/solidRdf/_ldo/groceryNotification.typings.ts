import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for groceryNotification
 * =============================================================================
 */

/**
 * GroceryNotification Type
 */
export interface GroceryNotification {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "GroceryNotification";
  }>;
  about?: {
    "@id": string;
  };
  status?: string;
  score?: number;
  item?: LdSet<GroceryItem>;
  created?: string;
}

/**
 * GroceryItem Type
 */
export interface GroceryItem {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  itemName?: string;
  itemQuantity?: number;
  itemUnit?: string;
  itemEstimatedPrice?: number;
  itemPricePerUnit?: number;
  itemIsOnSale?: boolean;
  itemSalePrice?: number;
  itemIsRecurring?: boolean;
  itemDaysOverdue?: number;
  itemEstimatedWeightKg?: number;
}
