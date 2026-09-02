// @ldo/ldo-based replacement for fromRdf.ts's extractGroceryNotification().
// leptum:item now actually round-trips (see groceryNotification.shex) —
// groceryNotificationToRdf previously spread each item's bare JS keys into
// the JSON-LD doc, which the @context (prefix-only) couldn't resolve, so
// every item field was silently dropped on write. Fixed alongside this shape.
import type { LdoDataset } from '@ldo/ldo';
import type { GroceryNotification } from '../../types/grocery';
import type { GroceryShoppingBriefItem } from '../../types/grocery';
import { GroceryNotificationShapeType } from './_ldo/groceryNotification.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractGroceryNotificationFromDataset(dataset: LdoDataset, url: string): GroceryNotification | null {
  const n = dataset.usingType(GroceryNotificationShapeType).fromSubject(url);
  const storeRef = n.about?.['@id'];
  if (!storeRef) return null;
  const items: GroceryShoppingBriefItem[] = Array.from(n.item ?? [])
    .filter((it): it is typeof it & { itemName: string } => !!it.itemName)
    .map((it) => {
      const item: GroceryShoppingBriefItem = { name: it.itemName };
      if (it.itemQuantity != null) item.quantity = it.itemQuantity;
      if (it.itemUnit) item.unit = it.itemUnit;
      if (it.itemEstimatedPrice != null) item.estimatedPrice = it.itemEstimatedPrice;
      if (it.itemPricePerUnit != null) item.pricePerUnit = it.itemPricePerUnit;
      if (it.itemIsOnSale != null) item.isOnSale = it.itemIsOnSale;
      if (it.itemSalePrice != null) item.salePrice = it.itemSalePrice;
      if (it.itemIsRecurring != null) item.isRecurring = it.itemIsRecurring;
      if (it.itemDaysOverdue != null) item.daysOverdue = it.itemDaysOverdue;
      if (it.itemEstimatedWeightKg != null) item.estimatedWeightKg = it.itemEstimatedWeightKg;
      return item;
    });
  return {
    id: idFromUrl(url),
    storeId: idFromUrl(storeRef),
    // Not persisted by groceryNotificationToRdf — computed client-side, same
    // v1 gap extractGroceryNotification() had.
    storeName: '',
    distance: 0,
    items,
    totalEstimatedPrice: 0,
    totalEstimatedWeightKg: 0,
    score: n.score ?? 0,
    createdAt: n.created ? new Date(n.created).getTime() : Date.now(),
    status: (n.status ?? 'pending') as GroceryNotification['status'],
  };
}
