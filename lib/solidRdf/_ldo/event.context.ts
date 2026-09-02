import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * eventContext: JSONLD Context for event
 * =============================================================================
 */
export const eventContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Event: {
    "@id": "https://schema.org/Event",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      startDate: {
        "@id": "https://schema.org/startDate",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      endDate: {
        "@id": "https://schema.org/endDate",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      color: {
        "@id": "https://schema.org/color",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      url: {
        "@id": "https://schema.org/url",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      about: {
        "@id": "https://schema.org/about",
        "@type": "@id",
      },
      image: {
        "@id": "https://schema.org/image",
        "@type": "@id",
        "@isCollection": true,
      },
      allDay: {
        "@id": "https://mpeters.dev/ns/leptum#allDay",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      dismissed: {
        "@id": "https://mpeters.dev/ns/leptum#dismissed",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      requiresOnlineTime: {
        "@id": "https://mpeters.dev/ns/leptum#requiresOnlineTime",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      stress: {
        "@id": "https://mpeters.dev/ns/leptum#stress",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      fulfillment: {
        "@id": "https://mpeters.dev/ns/leptum#fulfillment",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      motivation: {
        "@id": "https://mpeters.dev/ns/leptum#motivation",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      cleanliness: {
        "@id": "https://mpeters.dev/ns/leptum#cleanliness",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      happiness: {
        "@id": "https://mpeters.dev/ns/leptum#happiness",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      confidence: {
        "@id": "https://mpeters.dev/ns/leptum#confidence",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      energy: {
        "@id": "https://mpeters.dev/ns/leptum#energy",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      focus: {
        "@id": "https://mpeters.dev/ns/leptum#focus",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      shame: {
        "@id": "https://mpeters.dev/ns/leptum#shame",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      guilt: {
        "@id": "https://mpeters.dev/ns/leptum#guilt",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    },
  },
  name: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  startDate: {
    "@id": "https://schema.org/startDate",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  endDate: {
    "@id": "https://schema.org/endDate",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  color: {
    "@id": "https://schema.org/color",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  description: {
    "@id": "https://schema.org/description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  url: {
    "@id": "https://schema.org/url",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  about: {
    "@id": "https://schema.org/about",
    "@type": "@id",
  },
  image: {
    "@id": "https://schema.org/image",
    "@type": "@id",
    "@isCollection": true,
  },
  allDay: {
    "@id": "https://mpeters.dev/ns/leptum#allDay",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  dismissed: {
    "@id": "https://mpeters.dev/ns/leptum#dismissed",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  requiresOnlineTime: {
    "@id": "https://mpeters.dev/ns/leptum#requiresOnlineTime",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  stress: {
    "@id": "https://mpeters.dev/ns/leptum#stress",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  fulfillment: {
    "@id": "https://mpeters.dev/ns/leptum#fulfillment",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  motivation: {
    "@id": "https://mpeters.dev/ns/leptum#motivation",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  cleanliness: {
    "@id": "https://mpeters.dev/ns/leptum#cleanliness",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  happiness: {
    "@id": "https://mpeters.dev/ns/leptum#happiness",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  confidence: {
    "@id": "https://mpeters.dev/ns/leptum#confidence",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  energy: {
    "@id": "https://mpeters.dev/ns/leptum#energy",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  focus: {
    "@id": "https://mpeters.dev/ns/leptum#focus",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  shame: {
    "@id": "https://mpeters.dev/ns/leptum#shame",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  guilt: {
    "@id": "https://mpeters.dev/ns/leptum#guilt",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
};
