import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for health
 * =============================================================================
 */

/**
 * DailyHealthMetrics Type
 */
export interface DailyHealthMetrics {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "DailyHealthMetrics";
  }>;
  date?: string;
  steps?: number;
  distanceMeters?: number;
  activeCalories?: number;
  totalCalories?: number;
  sleepMinutes?: number;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  restingHeartRate?: number;
  hrvRmssd?: number;
  weightKg?: number;
  bodyFatPct?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodGlucoseMmol?: number;
  oxygenSaturationPct?: number;
  floorsClimbed?: number;
  exerciseSession?: LdSet<ExerciseSession>;
  sleepSession?: LdSet<SleepSession>;
}

/**
 * ExerciseSession Type
 */
export interface ExerciseSession {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  exerciseType?: number;
  name?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

/**
 * SleepSession Type
 */
export interface SleepSession {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}
