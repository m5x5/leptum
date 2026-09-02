import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * locationContext: JSONLD Context for location
 * =============================================================================
 */
export const locationContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
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
      accuracy: {
        "@id": "https://mpeters.dev/ns/leptum#accuracy",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
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
  accuracy: {
    "@id": "https://mpeters.dev/ns/leptum#accuracy",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
