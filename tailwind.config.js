/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#FAF9F6',
        'brand-sage': '#8F9779',
        'brand-terracotta': '#D97D64',
        'brand-charcoal': '#2C2C2E',
        'brand-warm-gray': '#F2F0EB',
      }
    },
  },
  plugins: [],
}
