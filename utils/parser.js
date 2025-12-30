export const getNumberFromString = (string) => {
  if (typeof string === "undefined") return 0;
  // Handle case where input is already a number
  if (typeof string === "number") return string;
  // Handle string input - preserve minus sign for negative numbers
  const number = parseInt(string, 10);
  return isNaN(number) ? 0 : number;
};
