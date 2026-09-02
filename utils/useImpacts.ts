import { remoteStorageClient } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

export interface Impact {
  id?: string;
  activity: string;
  date: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  happiness?: string | number;
  confidence?: string | number;
  energy?: string | number;
  focus?: string | number;
  shame?: string | number;
  guilt?: string | number;
  notes?: string;
  photoIds?: string[];
  endTime?: number;
}

// One query for every useImpacts() consumer on the page; any component that
// writes impacts dispatches `impactsUpdated`, which invalidates it.
export const impactsCollection = defineCollection<Impact[]>(
  'impacts',
  () => remoteStorageClient.getImpacts(),
  { initial: [], refreshOn: ['impactsUpdated'] }
);

export function useImpacts() {
  const { data, isPending, error } = impactsCollection.useQuery();
  return { impacts: data ?? [], loading: isPending, error, refresh: impactsCollection.invalidate };
}
