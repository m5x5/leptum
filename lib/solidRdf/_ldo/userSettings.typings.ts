import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for userSettings
 * =============================================================================
 */

/**
 * UserSettings Type
 */
export interface UserSettings {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "UserSettings";
  }>;
  showKeyboardShortcuts?: boolean;
  enabledExperiment?: LdSet<string>;
  colorScheme?: {
    "@id": "LightColorScheme" | "DarkColorScheme" | "SystemColorScheme";
  };
  timeFormat?: string;
  wakingStartHour?: string;
  wakingEndHour?: string;
  suggestContactsFrom?: LdSet<{
    "@id": string;
  }>;
  suggestContactsFromGroup?: LdSet<{
    "@id": string;
  }>;
}
