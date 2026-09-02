import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * groceryStoreContext: JSONLD Context for groceryStore
 * =============================================================================
 */
export const groceryStoreContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  GroceryStore: {
    "@id": "https://schema.org/GroceryStore",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      name: {
        "@id": "https://schema.org/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      address: {
        "@id": "https://schema.org/address",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      openingHours: {
        "@id": "https://schema.org/openingHours",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      geo: {
        "@id": "https://schema.org/geo",
        "@type": "@id",
      },
    },
  },
  name: {
    "@id": "https://schema.org/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  address: {
    "@id": "https://schema.org/address",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  openingHours: {
    "@id": "https://schema.org/openingHours",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  geo: {
    "@id": "https://schema.org/geo",
    "@type": "@id",
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
};
