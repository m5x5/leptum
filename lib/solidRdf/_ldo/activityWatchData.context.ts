import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * activityWatchDataContext: JSONLD Context for activityWatchData
 * =============================================================================
 */
export const activityWatchDataContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  ActivityWatchData: {
    "@id": "https://mpeters.dev/ns/leptum#ActivityWatchData",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      importedAt: {
        "@id": "https://mpeters.dev/ns/leptum#importedAt",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      event: {
        "@id": "https://mpeters.dev/ns/leptum#event",
        "@type": "@id",
        "@isCollection": true,
      },
      bucket: {
        "@id": "https://mpeters.dev/ns/leptum#bucket",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  importedAt: {
    "@id": "https://mpeters.dev/ns/leptum#importedAt",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  event: {
    "@id": "https://mpeters.dev/ns/leptum#event",
    "@type": "@id",
    "@isCollection": true,
  },
  id: {
    "@id": "https://mpeters.dev/ns/leptum#id",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  bucketId: {
    "@id": "https://mpeters.dev/ns/leptum#bucketId",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  bucketType: {
    "@id": "https://mpeters.dev/ns/leptum#bucketType",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  timestamp: {
    "@id": "https://mpeters.dev/ns/leptum#timestamp",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  duration: {
    "@id": "https://mpeters.dev/ns/leptum#duration",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  displayName: {
    "@id": "https://mpeters.dev/ns/leptum#displayName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  color: {
    "@id": "https://mpeters.dev/ns/leptum#color",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  isHidden: {
    "@id": "https://mpeters.dev/ns/leptum#isHidden",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  status: {
    "@id": "https://mpeters.dev/ns/leptum#status",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  file: {
    "@id": "https://mpeters.dev/ns/leptum#file",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  project: {
    "@id": "https://mpeters.dev/ns/leptum#project",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  language: {
    "@id": "https://mpeters.dev/ns/leptum#language",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  projectPath: {
    "@id": "https://mpeters.dev/ns/leptum#projectPath",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  editor: {
    "@id": "https://mpeters.dev/ns/leptum#editor",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  editorVersion: {
    "@id": "https://mpeters.dev/ns/leptum#editorVersion",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  eventType: {
    "@id": "https://mpeters.dev/ns/leptum#eventType",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  url: {
    "@id": "https://mpeters.dev/ns/leptum#url",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  title: {
    "@id": "https://mpeters.dev/ns/leptum#title",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  audible: {
    "@id": "https://mpeters.dev/ns/leptum#audible",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  incognito: {
    "@id": "https://mpeters.dev/ns/leptum#incognito",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  tabCount: {
    "@id": "https://mpeters.dev/ns/leptum#tabCount",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  app: {
    "@id": "https://mpeters.dev/ns/leptum#app",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  bucket: {
    "@id": "https://mpeters.dev/ns/leptum#bucket",
    "@type": "@id",
    "@isCollection": true,
  },
  eventCount: {
    "@id": "https://mpeters.dev/ns/leptum#eventCount",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  rangeStart: {
    "@id": "https://mpeters.dev/ns/leptum#rangeStart",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  rangeEnd: {
    "@id": "https://mpeters.dev/ns/leptum#rangeEnd",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  isVisible: {
    "@id": "https://mpeters.dev/ns/leptum#isVisible",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
};
