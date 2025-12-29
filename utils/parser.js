export const getNumberFromString = (string) => {
  if (typeof string === "undefined") return 0;
  // Handle case where input is already a number
  if (typeof string === "number") return string;
  // Handle string input
  const number = parseInt(string.replace(/[^0-9]/g, ""), 10);
  return isNaN(number) ? 0 : number;
};
