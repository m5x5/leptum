import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * taskContext: JSONLD Context for task
 * =============================================================================
 */
export const taskContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Action: {
    "@id": "https://schema.org/Action",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      rrule: {
        "@id": "http://www.w3.org/2002/12/cal/ical#rrule",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      summary: {
        "@id": "http://www.w3.org/2002/12/cal/ical#summary",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      actionStatus: {
        "@id": "https://schema.org/actionStatus",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      createdAt: {
        "@id": "https://vocab.noeldemartin.com/crdt/createdAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      completedAt: {
        "@id": "https://mpeters.dev/ns/leptum#completedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      archivedAt: {
        "@id": "https://mpeters.dev/ns/leptum#archivedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      about: {
        "@id": "https://schema.org/about",
        "@type": "@id",
        "@isCollection": true,
      },
      partOfRoutine: {
        "@id": "https://mpeters.dev/ns/leptum#partOfRoutine",
        "@type": "@id",
      },
      routineInstanceId: {
        "@id": "https://mpeters.dev/ns/leptum#routineInstanceId",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      effort: {
        "@id": "https://mpeters.dev/ns/leptum#effort",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      numericEstimate: {
        "@id": "https://mpeters.dev/ns/leptum#numericEstimate",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      emotions: {
        "@id": "https://mpeters.dev/ns/leptum#emotions",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      geo: {
        "@id": "https://schema.org/geo",
        "@type": "@id",
      },
      indoorX: {
        "@id": "https://mpeters.dev/ns/leptum#indoorX",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      indoorY: {
        "@id": "https://mpeters.dev/ns/leptum#indoorY",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      sortIndex: {
        "@id": "https://mpeters.dev/ns/leptum#sortIndex",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
    },
  },
  Vtodo: {
    "@id": "http://www.w3.org/2002/12/cal/ical#Vtodo",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      rrule: {
        "@id": "http://www.w3.org/2002/12/cal/ical#rrule",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      summary: {
        "@id": "http://www.w3.org/2002/12/cal/ical#summary",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      actionStatus: {
        "@id": "https://schema.org/actionStatus",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      createdAt: {
        "@id": "https://vocab.noeldemartin.com/crdt/createdAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      completedAt: {
        "@id": "https://mpeters.dev/ns/leptum#completedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      archivedAt: {
        "@id": "https://mpeters.dev/ns/leptum#archivedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      about: {
        "@id": "https://schema.org/about",
        "@type": "@id",
        "@isCollection": true,
      },
      partOfRoutine: {
        "@id": "https://mpeters.dev/ns/leptum#partOfRoutine",
        "@type": "@id",
      },
      routineInstanceId: {
        "@id": "https://mpeters.dev/ns/leptum#routineInstanceId",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      effort: {
        "@id": "https://mpeters.dev/ns/leptum#effort",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      numericEstimate: {
        "@id": "https://mpeters.dev/ns/leptum#numericEstimate",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      emotions: {
        "@id": "https://mpeters.dev/ns/leptum#emotions",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      geo: {
        "@id": "https://schema.org/geo",
        "@type": "@id",
      },
      indoorX: {
        "@id": "https://mpeters.dev/ns/leptum#indoorX",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      indoorY: {
        "@id": "https://mpeters.dev/ns/leptum#indoorY",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      sortIndex: {
        "@id": "https://mpeters.dev/ns/leptum#sortIndex",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
    },
  },
  rrule: {
    "@id": "http://www.w3.org/2002/12/cal/ical#rrule",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  name: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  summary: {
    "@id": "http://www.w3.org/2002/12/cal/ical#summary",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  description: {
    "@id": "https://schema.org/description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  actionStatus: {
    "@id": "https://schema.org/actionStatus",
    "@isCollection": true,
  },
  CompletedActionStatus: "https://schema.org/CompletedActionStatus",
  ActiveActionStatus: "https://schema.org/ActiveActionStatus",
  PotentialActionStatus: "https://schema.org/PotentialActionStatus",
  FailedActionStatus: "https://schema.org/FailedActionStatus",
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  createdAt: {
    "@id": "https://vocab.noeldemartin.com/crdt/createdAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  completedAt: {
    "@id": "https://mpeters.dev/ns/leptum#completedAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  archivedAt: {
    "@id": "https://mpeters.dev/ns/leptum#archivedAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  about: {
    "@id": "https://schema.org/about",
    "@type": "@id",
    "@isCollection": true,
  },
  partOfRoutine: {
    "@id": "https://mpeters.dev/ns/leptum#partOfRoutine",
    "@type": "@id",
  },
  routineInstanceId: {
    "@id": "https://mpeters.dev/ns/leptum#routineInstanceId",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  effort: {
    "@id": "https://mpeters.dev/ns/leptum#effort",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  numericEstimate: {
    "@id": "https://mpeters.dev/ns/leptum#numericEstimate",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  emotions: {
    "@id": "https://mpeters.dev/ns/leptum#emotions",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
    "@isCollection": true,
  },
  geo: {
    "@id": "https://schema.org/geo",
    "@type": "@id",
  },
  GeoCoordinates: {
    "@id": "https://schema.org/GeoCoordinates",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      latitude: {
        "@id": "https://schema.org/latitude",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      longitude: {
        "@id": "https://schema.org/longitude",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
    },
  },
  latitude: {
    "@id": "https://schema.org/latitude",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  longitude: {
    "@id": "https://schema.org/longitude",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  indoorX: {
    "@id": "https://mpeters.dev/ns/leptum#indoorX",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  indoorY: {
    "@id": "https://mpeters.dev/ns/leptum#indoorY",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  sortIndex: {
    "@id": "https://mpeters.dev/ns/leptum#sortIndex",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
};
