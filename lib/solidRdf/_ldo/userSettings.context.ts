import type { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * userSettingsContext: JSONLD Context for userSettings
 * =============================================================================
 */
export const userSettingsContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  UserSettings: {
    "@id": "https://mpeters.dev/ns/leptum#UserSettings",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      showKeyboardShortcuts: {
        "@id": "https://mpeters.dev/ns/leptum#showKeyboardShortcuts",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      enabledExperiment: {
        "@id": "https://mpeters.dev/ns/leptum#enabledExperiment",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      colorScheme: {
        "@id": "http://www.w3.org/ns/ui#colorScheme",
        "@type": "@id",
      },
      timeFormat: {
        "@id": "https://mpeters.dev/ns/leptum#timeFormat",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      wakingStartHour: {
        "@id": "https://mpeters.dev/ns/leptum#wakingStartHour",
        "@type": "http://www.w3.org/2001/XMLSchema#time",
      },
      wakingEndHour: {
        "@id": "https://mpeters.dev/ns/leptum#wakingEndHour",
        "@type": "http://www.w3.org/2001/XMLSchema#time",
      },
      suggestContactsFrom: {
        "@id": "https://mpeters.dev/ns/leptum#suggestContactsFrom",
        "@type": "@id",
        "@isCollection": true,
      },
      suggestContactsFromGroup: {
        "@id": "https://mpeters.dev/ns/leptum#suggestContactsFromGroup",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  showKeyboardShortcuts: {
    "@id": "https://mpeters.dev/ns/leptum#showKeyboardShortcuts",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  enabledExperiment: {
    "@id": "https://mpeters.dev/ns/leptum#enabledExperiment",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
    "@isCollection": true,
  },
  colorScheme: {
    "@id": "http://www.w3.org/ns/ui#colorScheme",
    "@type": "@id",
  },
  timeFormat: {
    "@id": "https://mpeters.dev/ns/leptum#timeFormat",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  wakingStartHour: {
    "@id": "https://mpeters.dev/ns/leptum#wakingStartHour",
    "@type": "http://www.w3.org/2001/XMLSchema#time",
  },
  wakingEndHour: {
    "@id": "https://mpeters.dev/ns/leptum#wakingEndHour",
    "@type": "http://www.w3.org/2001/XMLSchema#time",
  },
  suggestContactsFrom: {
    "@id": "https://mpeters.dev/ns/leptum#suggestContactsFrom",
    "@type": "@id",
    "@isCollection": true,
  },
  suggestContactsFromGroup: {
    "@id": "https://mpeters.dev/ns/leptum#suggestContactsFromGroup",
    "@type": "@id",
    "@isCollection": true,
  },
};
