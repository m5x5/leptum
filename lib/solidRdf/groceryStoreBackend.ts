import { createRdfBackend } from './backendFactory';
import { groceryStoreToRdf } from './transform';
import { extractGroceryStoreFromDataset } from './groceryStoreShape';
import type { GroceryStore } from '../../types/grocery';

export const groceryStoreBackend = createRdfBackend<GroceryStore>({
  containerKey: 'groceryStores',
  toRdf: groceryStoreToRdf,
  extract: extractGroceryStoreFromDataset,
  empty: (id) => ({ id, name: '', lat: 0, lon: 0 }),
});
