import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * noteContext: JSONLD Context for note
 * =============================================================================
 */
export const noteContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Note: {
    "@id": "https://www.w3.org/ns/activitystreams#Note",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      content: {
        "@id": "https://www.w3.org/ns/activitystreams#content",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      published: {
        "@id": "https://www.w3.org/ns/activitystreams#published",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      updated: {
        "@id": "https://www.w3.org/ns/activitystreams#updated",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      attachment: {
        "@id": "https://www.w3.org/ns/activitystreams#attachment",
        "@type": "@id",
        "@isCollection": true,
      },
      audio: {
        "@id": "https://schema.org/audio",
        "@type": "@id",
      },
      weekStart: {
        "@id": "https://mpeters.dev/ns/leptum#weekStart",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    },
  },
  content: {
    "@id": "https://www.w3.org/ns/activitystreams#content",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  published: {
    "@id": "https://www.w3.org/ns/activitystreams#published",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  updated: {
    "@id": "https://www.w3.org/ns/activitystreams#updated",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  attachment: {
    "@id": "https://www.w3.org/ns/activitystreams#attachment",
    "@type": "@id",
    "@isCollection": true,
  },
  audio: {
    "@id": "https://schema.org/audio",
    "@type": "@id",
  },
  AudioObject: {
    "@id": "https://schema.org/AudioObject",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      contentUrl: {
        "@id": "https://schema.org/contentUrl",
        "@type": "@id",
      },
      duration: {
        "@id": "https://schema.org/duration",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
    },
  },
  contentUrl: {
    "@id": "https://schema.org/contentUrl",
    "@type": "@id",
  },
  duration: {
    "@id": "https://schema.org/duration",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  weekStart: {
    "@id": "https://mpeters.dev/ns/leptum#weekStart",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
};
