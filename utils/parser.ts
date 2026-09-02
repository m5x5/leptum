/** Parses a metric value that may be stored as a number or a (possibly negative) numeric string; anything else is 0. */
export const getNumberFromString = (value: string | number | null | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? 0 : number;
};
