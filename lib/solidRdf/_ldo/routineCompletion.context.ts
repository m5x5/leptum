import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * routineCompletionContext: JSONLD Context for routineCompletion
 * =============================================================================
 */
export const routineCompletionContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  CompleteAction: {
    "@id": "https://schema.org/CompleteAction",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      object: {
        "@id": "https://schema.org/object",
        "@type": "@id",
      },
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      endTime: {
        "@id": "https://schema.org/endTime",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      routineInstanceId: {
        "@id": "https://mpeters.dev/ns/leptum#routineInstanceId",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      taskCount: {
        "@id": "https://mpeters.dev/ns/leptum#taskCount",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
    },
  },
  object: {
    "@id": "https://schema.org/object",
    "@type": "@id",
  },
  name: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  endTime: {
    "@id": "https://schema.org/endTime",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  routineInstanceId: {
    "@id": "https://mpeters.dev/ns/leptum#routineInstanceId",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  taskCount: {
    "@id": "https://mpeters.dev/ns/leptum#taskCount",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
};
