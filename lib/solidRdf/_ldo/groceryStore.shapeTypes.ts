import type { ShapeType } from "@ldo/ldo";
import { groceryStoreSchema } from "./groceryStore.schema";
import { groceryStoreContext } from "./groceryStore.context";
import type { GroceryStore, GroceryStoreGeo } from "./groceryStore.typings";

/**
 * =============================================================================
 * LDO ShapeTypes groceryStore
 * =============================================================================
 */

/**
 * GroceryStore ShapeType
 */
export const GroceryStoreShapeType: ShapeType<GroceryStore> = {
  schema: groceryStoreSchema,
  shape: "https://mpeters.dev/ns/leptum#GroceryStoreShape",
  context: groceryStoreContext,
};

/**
 * GroceryStoreGeo ShapeType
 */
export const GroceryStoreGeoShapeType: ShapeType<GroceryStoreGeo> = {
  schema: groceryStoreSchema,
  shape: "https://mpeters.dev/ns/leptum#GroceryStoreGeoShape",
  context: groceryStoreContext,
};
