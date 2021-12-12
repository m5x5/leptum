const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media", // or 'media' or 'class'
  theme: {
    ripple: (theme) => ({
      colors: theme("colors"),
    }),
    extend: {
      fontFamily: {
        sans: ["Product Sans", ...defaultTheme.fontFamily.sans],
      },
      gridTemplateColumns: {
        task: "1fr auto",
      },
      gridTemplateRows: {
        task: "1fr auto",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("tailwindcss-ripple")()],
};
