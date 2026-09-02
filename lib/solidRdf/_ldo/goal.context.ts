import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * goalContext: JSONLD Context for goal
 * =============================================================================
 */
export const goalContext: LdoJsonldContext = {
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
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      color: {
        "@id": "https://schema.org/color",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      additionalType: {
        "@id": "https://schema.org/additionalType",
        "@type": "@id",
      },
      actionStatus: {
        "@id": "https://schema.org/actionStatus",
        "@isCollection": true,
      },
      endTime: {
        "@id": "https://schema.org/endTime",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      completedAt: {
        "@id": "https://mpeters.dev/ns/leptum#completedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      milestone: {
        "@id": "https://mpeters.dev/ns/leptum#milestone",
        "@type": "@id",
        "@isCollection": true,
      },
      trackingConfig: {
        "@id": "https://mpeters.dev/ns/leptum#trackingConfig",
        "@type": "@id",
      },
      trackingEntry: {
        "@id": "https://mpeters.dev/ns/leptum#trackingEntry",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  Goal: {
    "@id": "https://mpeters.dev/ns/leptum#Goal",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      color: {
        "@id": "https://schema.org/color",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      additionalType: {
        "@id": "https://schema.org/additionalType",
        "@type": "@id",
      },
      actionStatus: {
        "@id": "https://schema.org/actionStatus",
        "@isCollection": true,
      },
      endTime: {
        "@id": "https://schema.org/endTime",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      completedAt: {
        "@id": "https://mpeters.dev/ns/leptum#completedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      milestone: {
        "@id": "https://mpeters.dev/ns/leptum#milestone",
        "@type": "@id",
        "@isCollection": true,
      },
      trackingConfig: {
        "@id": "https://mpeters.dev/ns/leptum#trackingConfig",
        "@type": "@id",
      },
      trackingEntry: {
        "@id": "https://mpeters.dev/ns/leptum#trackingEntry",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  name: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  description: {
    "@id": "https://schema.org/description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  color: {
    "@id": "https://schema.org/color",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  additionalType: {
    "@id": "https://schema.org/additionalType",
    "@type": "@id",
  },
  actionStatus: {
    "@id": "https://schema.org/actionStatus",
    "@isCollection": true,
  },
  CompletedActionStatus: "https://schema.org/CompletedActionStatus",
  ActiveActionStatus: "https://schema.org/ActiveActionStatus",
  PotentialActionStatus: "https://schema.org/PotentialActionStatus",
  FailedActionStatus: "https://schema.org/FailedActionStatus",
  endTime: {
    "@id": "https://schema.org/endTime",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  completedAt: {
    "@id": "https://mpeters.dev/ns/leptum#completedAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  milestone: {
    "@id": "https://mpeters.dev/ns/leptum#milestone",
    "@type": "@id",
    "@isCollection": true,
  },
  order: {
    "@id": "https://mpeters.dev/ns/leptum#order",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  trackingConfig: {
    "@id": "https://mpeters.dev/ns/leptum#trackingConfig",
    "@type": "@id",
  },
  trackingType: {
    "@id": "https://mpeters.dev/ns/leptum#trackingType",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  unit: {
    "@id": "https://mpeters.dev/ns/leptum#unit",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  icon: {
    "@id": "https://mpeters.dev/ns/leptum#icon",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  dailyTarget: {
    "@id": "https://mpeters.dev/ns/leptum#dailyTarget",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  maxPerDay: {
    "@id": "https://mpeters.dev/ns/leptum#maxPerDay",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  increments: {
    "@id": "https://mpeters.dev/ns/leptum#increments",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
    "@isCollection": true,
  },
  options: {
    "@id": "https://mpeters.dev/ns/leptum#options",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
    "@isCollection": true,
  },
  trackingEntry: {
    "@id": "https://mpeters.dev/ns/leptum#trackingEntry",
    "@type": "@id",
    "@isCollection": true,
  },
  date: {
    "@id": "https://mpeters.dev/ns/leptum#date",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  value: {
    "@id": "https://mpeters.dev/ns/leptum#value",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  completed: {
    "@id": "https://mpeters.dev/ns/leptum#completed",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  notes: {
    "@id": "https://mpeters.dev/ns/leptum#notes",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  timestamp: {
    "@id": "https://mpeters.dev/ns/leptum#timestamp",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
