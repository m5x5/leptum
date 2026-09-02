import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * patternNoteContext: JSONLD Context for patternNote
 * =============================================================================
 */
export const patternNoteContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  PatternNote: {
    "@id": "https://mpeters.dev/ns/leptum#PatternNote",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      activity: {
        "@id": "https://mpeters.dev/ns/leptum#activity",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      content: {
        "@id": "https://www.w3.org/ns/activitystreams#content",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      modified: {
        "@id": "http://purl.org/dc/terms/modified",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  activity: {
    "@id": "https://mpeters.dev/ns/leptum#activity",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  content: {
    "@id": "https://www.w3.org/ns/activitystreams#content",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  modified: {
    "@id": "http://purl.org/dc/terms/modified",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
