// export capitalize function
export const capitalize = (str) => {
  let strArr = str.split("");
  strArr = strArr.map((char, i) => {
    if (!i) {
      return char.toUpperCase();
    }
    return char;
  });
  return strArr.join("");
};
