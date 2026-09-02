import { createRdfBackend } from './backendFactory';
import { groceryNotificationToRdf } from './transform';
import { extractGroceryNotificationFromDataset } from './groceryNotificationShape';
import type { GroceryNotification } from '../../types/grocery';

export const groceryNotificationBackend = createRdfBackend<GroceryNotification>({
  containerKey: 'groceryNotifications',
  toRdf: groceryNotificationToRdf,
  extract: extractGroceryNotificationFromDataset,
  empty: (id) => ({
    id,
    storeId: '',
    storeName: '',
    distance: 0,
    items: [],
    totalEstimatedPrice: 0,
    totalEstimatedWeightKg: 0,
    score: 0,
    createdAt: Date.now(),
    status: 'pending',
  }),
});
