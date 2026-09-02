// @ldo/ldo-based replacement for fromRdf.ts's extractGroceryStore().
import type { LdoDataset } from '@ldo/ldo';
import type { GroceryStore } from '../../types/grocery';
import { GroceryStoreShapeType } from './_ldo/groceryStore.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractGroceryStoreFromDataset(dataset: LdoDataset, url: string): GroceryStore | null {
  const s = dataset.usingType(GroceryStoreShapeType).fromSubject(url);
  if (!s.name || s.geo?.latitude == null || s.geo?.longitude == null) return null;
  const store: GroceryStore = { id: idFromUrl(url), name: s.name, lat: s.geo.latitude, lon: s.geo.longitude };
  if (s.address) store.address = s.address;
  if (s.openingHours) store.openingHours = s.openingHours;
  return store;
}
