import type { LdoJsonldContext, LdSet } from "@ldo/ldo";

/**
 * =============================================================================
 * Typescript Typings for event
 * =============================================================================
 */

/**
 * Event Type
 */
export interface Event {
  "@id"?: string;
  "@context"?: LdoJsonldContext;
  type: LdSet<{
    "@id": "Event";
  }>;
  name?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
  created?: string;
  description?: string;
  url?: string;
  about?: {
    "@id": string;
  };
  image?: LdSet<{
    "@id": string;
  }>;
  allDay?: boolean;
  dismissed?: boolean;
  requiresOnlineTime?: boolean;
  stress?: string;
  fulfillment?: string;
  motivation?: string;
  cleanliness?: string;
  happiness?: string;
  confidence?: string;
  energy?: string;
  focus?: string;
  shame?: string;
  guilt?: string;
}
