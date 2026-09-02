import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * velocityEntryContext: JSONLD Context for velocityEntry
 * =============================================================================
 */
export const velocityEntryContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  VelocityEntry: {
    "@id": "https://mpeters.dev/ns/leptum#VelocityEntry",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      about: {
        "@id": "https://schema.org/about",
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
      effort: {
        "@id": "https://mpeters.dev/ns/leptum#effort",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      numericEstimate: {
        "@id": "https://mpeters.dev/ns/leptum#numericEstimate",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      period: {
        "@id": "https://mpeters.dev/ns/leptum#period",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    },
  },
  about: {
    "@id": "https://schema.org/about",
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
  effort: {
    "@id": "https://mpeters.dev/ns/leptum#effort",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  numericEstimate: {
    "@id": "https://mpeters.dev/ns/leptum#numericEstimate",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  period: {
    "@id": "https://mpeters.dev/ns/leptum#period",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
};
