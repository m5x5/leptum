// @ldo/ldo-based replacement for fromRdf.ts's extractLocation().
import type { LdoDataset } from '@ldo/ldo';
import type { LocationUpdate } from '../../types/grocery';
import { LocationShapeType } from './_ldo/location.shapeTypes';

export function extractLocationFromDataset(dataset: LdoDataset, url: string): LocationUpdate | null {
  const loc = dataset.usingType(LocationShapeType).fromSubject(url);
  if (loc.latitude == null || loc.longitude == null) return null;
  const result: LocationUpdate = {
    lat: loc.latitude,
    lon: loc.longitude,
    timestamp: loc.created ? new Date(loc.created).getTime() : Date.now(),
  };
  if (loc.accuracy != null) result.accuracy = loc.accuracy;
  return result;
}
