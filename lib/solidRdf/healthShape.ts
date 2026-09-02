// @ldo/ldo-based reader for DailyHealthData — read-only from this app's side
// (see health.shex); nothing in this repo writes health data.
import type { LdoDataset } from '@ldo/ldo';
import type { DailyHealthData } from '../remoteStorage';
import { DailyHealthMetricsShapeType } from './_ldo/health.shapeTypes';

const NUMERIC_FIELDS = [
  'steps', 'distanceMeters', 'activeCalories', 'totalCalories', 'sleepMinutes',
  'heartRateAvg', 'heartRateMin', 'heartRateMax', 'restingHeartRate', 'hrvRmssd',
  'weightKg', 'bodyFatPct', 'bloodPressureSystolic', 'bloodPressureDiastolic',
  'bloodGlucoseMmol', 'oxygenSaturationPct', 'floorsClimbed',
] as const;

export function extractDailyHealthDataFromDataset(dataset: LdoDataset, url: string): DailyHealthData | null {
  const h = dataset.usingType(DailyHealthMetricsShapeType).fromSubject(url);
  if (!h.date) return null;

  const data: DailyHealthData = { date: h.date };
  for (const field of NUMERIC_FIELDS) {
    const v = h[field];
    if (v != null) data[field] = v;
  }

  const exerciseSessions = Array.from(h.exerciseSession ?? [])
    .filter((s) => s.exerciseType != null && s.startTime && s.endTime && s.durationMinutes != null)
    .map((s) => ({
      type: s.exerciseType!,
      ...(s.name ? { title: s.name } : {}),
      startTime: s.startTime!,
      endTime: s.endTime!,
      durationMinutes: s.durationMinutes!,
    }));
  if (exerciseSessions.length) data.exerciseSessions = exerciseSessions;

  const sleepSessions = Array.from(h.sleepSession ?? [])
    .filter((s) => s.startTime && s.endTime && s.durationMinutes != null)
    .map((s) => ({ startTime: s.startTime!, endTime: s.endTime!, durationMinutes: s.durationMinutes! }));
  if (sleepSessions.length) data.sleepSessions = sleepSessions;

  return data;
}
