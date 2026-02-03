/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx,js}',
    './components/**/*.{js,ts,tsx}',
    './app/**/*.{ts,tsx,js}',
    './src/**/*.{ts,tsx,js}',
  ],
  plugins: [require("tailwindcss-animate")],
}