import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * entityContext: JSONLD Context for entity
 * =============================================================================
 */
export const entityContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Person: {
    "@id": "http://xmlns.com/foaf/0.1/Person",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      name: {
        "@id": "http://xmlns.com/foaf/0.1/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name2: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      tag: {
        "@id": "https://mpeters.dev/ns/leptum#tag",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  Project: {
    "@id": "https://schema.org/Project",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      name: {
        "@id": "http://xmlns.com/foaf/0.1/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name2: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      tag: {
        "@id": "https://mpeters.dev/ns/leptum#tag",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  Context: {
    "@id": "https://mpeters.dev/ns/leptum#Context",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      name: {
        "@id": "http://xmlns.com/foaf/0.1/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name2: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      description: {
        "@id": "https://schema.org/description",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      tag: {
        "@id": "https://mpeters.dev/ns/leptum#tag",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  name: {
    "@id": "http://xmlns.com/foaf/0.1/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  name2: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  description: {
    "@id": "https://schema.org/description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  tag: {
    "@id": "https://mpeters.dev/ns/leptum#tag",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
    "@isCollection": true,
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
