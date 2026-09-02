// Read-only: nothing in this app writes health data (see health.shex) — an
// external tool populates it directly. save/update/delete are wired for
// interface consistency but are never expected to be called from the app.
import { createRdfBackend } from './backendFactory';
import { healthDataToRdf } from './transform';
import { extractDailyHealthDataFromDataset } from './healthShape';
import type { DailyHealthData } from '../remoteStorage';

export const healthBackend = createRdfBackend<DailyHealthData & { id: string }>({
  containerKey: 'health',
  toRdf: (ctx, h) => healthDataToRdf(ctx, h),
  extract: (dataset, url) => {
    const data = extractDailyHealthDataFromDataset(dataset, url);
    return data ? { ...data, id: data.date } : null;
  },
  empty: (id) => ({ id, date: id }),
});
