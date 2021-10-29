export const getNumberFromString = (string) => {
  if (typeof string === "undefined") return 0;
  const number = parseInt(string.replace(/[^0-9]/g, ""), 10);
  return isNaN(number) ? 0 : number;
};
