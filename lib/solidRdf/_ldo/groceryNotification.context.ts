import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * groceryNotificationContext: JSONLD Context for groceryNotification
 * =============================================================================
 */
export const groceryNotificationContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  GroceryNotification: {
    "@id": "https://mpeters.dev/ns/leptum#GroceryNotification",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      about: {
        "@id": "https://schema.org/about",
        "@type": "@id",
      },
      status: {
        "@id": "https://mpeters.dev/ns/leptum#status",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      score: {
        "@id": "https://mpeters.dev/ns/leptum#score",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      item: {
        "@id": "https://mpeters.dev/ns/leptum#item",
        "@type": "@id",
        "@isCollection": true,
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  about: {
    "@id": "https://schema.org/about",
    "@type": "@id",
  },
  status: {
    "@id": "https://mpeters.dev/ns/leptum#status",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  score: {
    "@id": "https://mpeters.dev/ns/leptum#score",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  item: {
    "@id": "https://mpeters.dev/ns/leptum#item",
    "@type": "@id",
    "@isCollection": true,
  },
  itemName: {
    "@id": "https://mpeters.dev/ns/leptum#itemName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  itemQuantity: {
    "@id": "https://mpeters.dev/ns/leptum#itemQuantity",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  itemUnit: {
    "@id": "https://mpeters.dev/ns/leptum#itemUnit",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  itemEstimatedPrice: {
    "@id": "https://mpeters.dev/ns/leptum#itemEstimatedPrice",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  itemPricePerUnit: {
    "@id": "https://mpeters.dev/ns/leptum#itemPricePerUnit",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  itemIsOnSale: {
    "@id": "https://mpeters.dev/ns/leptum#itemIsOnSale",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  itemSalePrice: {
    "@id": "https://mpeters.dev/ns/leptum#itemSalePrice",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  itemIsRecurring: {
    "@id": "https://mpeters.dev/ns/leptum#itemIsRecurring",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  itemDaysOverdue: {
    "@id": "https://mpeters.dev/ns/leptum#itemDaysOverdue",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  itemEstimatedWeightKg: {
    "@id": "https://mpeters.dev/ns/leptum#itemEstimatedWeightKg",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
