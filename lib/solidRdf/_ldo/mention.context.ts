import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * mentionContext: JSONLD Context for mention
 * =============================================================================
 */
export const mentionContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Annotation: {
    "@id": "http://www.w3.org/ns/oa#Annotation",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      hasTarget: {
        "@id": "http://www.w3.org/ns/oa#hasTarget",
        "@type": "@id",
      },
      hasBody: {
        "@id": "http://www.w3.org/ns/oa#hasBody",
        "@type": "@id",
      },
      fieldName: {
        "@id": "https://mpeters.dev/ns/leptum#fieldName",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      context: {
        "@id": "https://mpeters.dev/ns/leptum#context",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      position: {
        "@id": "https://mpeters.dev/ns/leptum#position",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  hasTarget: {
    "@id": "http://www.w3.org/ns/oa#hasTarget",
    "@type": "@id",
  },
  hasBody: {
    "@id": "http://www.w3.org/ns/oa#hasBody",
    "@type": "@id",
  },
  fieldName: {
    "@id": "https://mpeters.dev/ns/leptum#fieldName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  context: {
    "@id": "https://mpeters.dev/ns/leptum#context",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  position: {
    "@id": "https://mpeters.dev/ns/leptum#position",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
