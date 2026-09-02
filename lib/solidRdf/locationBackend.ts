import { createSingletonBackend } from './singletonBackend';
import { locationToRdf } from './transform';
import { extractLocationFromDataset } from './locationShape';
import type { LocationUpdate } from '../../types/grocery';

export const locationBackend = createSingletonBackend<LocationUpdate>({
  containerKey: 'locations',
  resourceId: 'current',
  toRdf: locationToRdf,
  extract: extractLocationFromDataset,
});
