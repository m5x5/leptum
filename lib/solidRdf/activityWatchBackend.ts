import { createSingletonBackend } from './singletonBackend';
import { activityWatchDataToRdf } from './transform';
import { extractActivityWatchDataFromDataset } from './activityWatchShape';
import type { ActivityWatchData } from '../../activity-watch.d';

export const activityWatchBackend = createSingletonBackend<ActivityWatchData>({
  containerKey: 'activityWatch',
  resourceId: 'current',
  toRdf: activityWatchDataToRdf,
  extract: extractActivityWatchDataFromDataset,
});
