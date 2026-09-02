export const capitalize = (str: string): string =>
  str.length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1);

export const IMPACT_TYPES = [
  "stress",
  "cleanliness",
  "motivation",
  "confidence",
  "happiness",
  "shame",
  "gratitude",
  "energy",
  "fulfillment",
  "guilt",
  "commitment",
] as const;

export type ImpactType = (typeof IMPACT_TYPES)[number];
