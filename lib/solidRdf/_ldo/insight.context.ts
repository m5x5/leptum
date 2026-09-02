import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * insightContext: JSONLD Context for insight
 * =============================================================================
 */
export const insightContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Insight: {
    "@id": "https://mpeters.dev/ns/leptum#Insight",
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
      category: {
        "@id": "https://mpeters.dev/ns/leptum#category",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      affectedMetric: {
        "@id": "https://mpeters.dev/ns/leptum#affectedMetric",
        "@type": "@id",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
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
  category: {
    "@id": "https://mpeters.dev/ns/leptum#category",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  affectedMetric: {
    "@id": "https://mpeters.dev/ns/leptum#affectedMetric",
    "@type": "@id",
    "@isCollection": true,
  },
  metric: {
    "@id": "https://mpeters.dev/ns/leptum#metric",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  effect: {
    "@id": "https://mpeters.dev/ns/leptum#effect",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
