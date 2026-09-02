import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * healthContext: JSONLD Context for health
 * =============================================================================
 */
export const healthContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  DailyHealthMetrics: {
    "@id": "https://mpeters.dev/ns/leptum#DailyHealthMetrics",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      date: {
        "@id": "https://mpeters.dev/ns/leptum#date",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      steps: {
        "@id": "https://mpeters.dev/ns/leptum#steps",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      distanceMeters: {
        "@id": "https://mpeters.dev/ns/leptum#distanceMeters",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      activeCalories: {
        "@id": "https://mpeters.dev/ns/leptum#activeCalories",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      totalCalories: {
        "@id": "https://mpeters.dev/ns/leptum#totalCalories",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      sleepMinutes: {
        "@id": "https://mpeters.dev/ns/leptum#sleepMinutes",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      heartRateAvg: {
        "@id": "https://mpeters.dev/ns/leptum#heartRateAvg",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      heartRateMin: {
        "@id": "https://mpeters.dev/ns/leptum#heartRateMin",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      heartRateMax: {
        "@id": "https://mpeters.dev/ns/leptum#heartRateMax",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      restingHeartRate: {
        "@id": "https://mpeters.dev/ns/leptum#restingHeartRate",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      hrvRmssd: {
        "@id": "https://mpeters.dev/ns/leptum#hrvRmssd",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      weightKg: {
        "@id": "https://mpeters.dev/ns/leptum#weightKg",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      bodyFatPct: {
        "@id": "https://mpeters.dev/ns/leptum#bodyFatPct",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      bloodPressureSystolic: {
        "@id": "https://mpeters.dev/ns/leptum#bloodPressureSystolic",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      bloodPressureDiastolic: {
        "@id": "https://mpeters.dev/ns/leptum#bloodPressureDiastolic",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      bloodGlucoseMmol: {
        "@id": "https://mpeters.dev/ns/leptum#bloodGlucoseMmol",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      oxygenSaturationPct: {
        "@id": "https://mpeters.dev/ns/leptum#oxygenSaturationPct",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      floorsClimbed: {
        "@id": "https://mpeters.dev/ns/leptum#floorsClimbed",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      exerciseSession: {
        "@id": "https://mpeters.dev/ns/leptum#exerciseSession",
        "@type": "@id",
        "@isCollection": true,
      },
      sleepSession: {
        "@id": "https://mpeters.dev/ns/leptum#sleepSession",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  date: {
    "@id": "https://mpeters.dev/ns/leptum#date",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  steps: {
    "@id": "https://mpeters.dev/ns/leptum#steps",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  distanceMeters: {
    "@id": "https://mpeters.dev/ns/leptum#distanceMeters",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  activeCalories: {
    "@id": "https://mpeters.dev/ns/leptum#activeCalories",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  totalCalories: {
    "@id": "https://mpeters.dev/ns/leptum#totalCalories",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  sleepMinutes: {
    "@id": "https://mpeters.dev/ns/leptum#sleepMinutes",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  heartRateAvg: {
    "@id": "https://mpeters.dev/ns/leptum#heartRateAvg",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  heartRateMin: {
    "@id": "https://mpeters.dev/ns/leptum#heartRateMin",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  heartRateMax: {
    "@id": "https://mpeters.dev/ns/leptum#heartRateMax",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  restingHeartRate: {
    "@id": "https://mpeters.dev/ns/leptum#restingHeartRate",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  hrvRmssd: {
    "@id": "https://mpeters.dev/ns/leptum#hrvRmssd",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  weightKg: {
    "@id": "https://mpeters.dev/ns/leptum#weightKg",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  bodyFatPct: {
    "@id": "https://mpeters.dev/ns/leptum#bodyFatPct",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  bloodPressureSystolic: {
    "@id": "https://mpeters.dev/ns/leptum#bloodPressureSystolic",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  bloodPressureDiastolic: {
    "@id": "https://mpeters.dev/ns/leptum#bloodPressureDiastolic",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  bloodGlucoseMmol: {
    "@id": "https://mpeters.dev/ns/leptum#bloodGlucoseMmol",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  oxygenSaturationPct: {
    "@id": "https://mpeters.dev/ns/leptum#oxygenSaturationPct",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  floorsClimbed: {
    "@id": "https://mpeters.dev/ns/leptum#floorsClimbed",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  exerciseSession: {
    "@id": "https://mpeters.dev/ns/leptum#exerciseSession",
    "@type": "@id",
    "@isCollection": true,
  },
  exerciseType: {
    "@id": "https://mpeters.dev/ns/leptum#exerciseType",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  name: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  startTime: {
    "@id": "https://schema.org/startTime",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  endTime: {
    "@id": "https://schema.org/endTime",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  durationMinutes: {
    "@id": "https://mpeters.dev/ns/leptum#durationMinutes",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  sleepSession: {
    "@id": "https://mpeters.dev/ns/leptum#sleepSession",
    "@type": "@id",
    "@isCollection": true,
  },
};
