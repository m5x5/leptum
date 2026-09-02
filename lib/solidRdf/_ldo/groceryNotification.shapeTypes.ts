import type { ShapeType } from "@ldo/ldo";
import { groceryNotificationSchema } from "./groceryNotification.schema";
import { groceryNotificationContext } from "./groceryNotification.context";
import type {
  GroceryNotification,
  GroceryItem,
} from "./groceryNotification.typings";

/**
 * =============================================================================
 * LDO ShapeTypes groceryNotification
 * =============================================================================
 */

/**
 * GroceryNotification ShapeType
 */
export const GroceryNotificationShapeType: ShapeType<GroceryNotification> = {
  schema: groceryNotificationSchema,
  shape: "https://mpeters.dev/ns/leptum#GroceryNotificationShape",
  context: groceryNotificationContext,
};

/**
 * GroceryItem ShapeType
 */
export const GroceryItemShapeType: ShapeType<GroceryItem> = {
  schema: groceryNotificationSchema,
  shape: "https://mpeters.dev/ns/leptum#GroceryItemShape",
  context: groceryNotificationContext,
};
