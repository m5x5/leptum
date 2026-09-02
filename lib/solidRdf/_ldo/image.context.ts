import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * imageContext: JSONLD Context for image
 * =============================================================================
 */
export const imageContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  ImageObject: {
    "@id": "https://schema.org/ImageObject",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      aboutImpact: {
        "@id": "https://mpeters.dev/ns/leptum#aboutImpact",
        "@type": "@id",
      },
      contentUrl: {
        "@id": "https://schema.org/contentUrl",
        "@type": "@id",
      },
      encodingFormat: {
        "@id": "https://schema.org/encodingFormat",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      width: {
        "@id": "https://schema.org/width",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      height: {
        "@id": "https://schema.org/height",
        "@type": "http://www.w3.org/2001/XMLSchema#decimal",
      },
      caption: {
        "@id": "https://schema.org/caption",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      created: {
        "@id": "http://purl.org/dc/terms/created",
        "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
      },
    },
  },
  aboutImpact: {
    "@id": "https://mpeters.dev/ns/leptum#aboutImpact",
    "@type": "@id",
  },
  contentUrl: {
    "@id": "https://schema.org/contentUrl",
    "@type": "@id",
  },
  encodingFormat: {
    "@id": "https://schema.org/encodingFormat",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  width: {
    "@id": "https://schema.org/width",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  height: {
    "@id": "https://schema.org/height",
    "@type": "http://www.w3.org/2001/XMLSchema#decimal",
  },
  caption: {
    "@id": "https://schema.org/caption",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  created: {
    "@id": "http://purl.org/dc/terms/created",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
};
