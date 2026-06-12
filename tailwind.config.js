/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'brand-nude': '#F1E7E2',
        'brand-beige': '#E7D8D0',
        'brand-rose-light': '#D7A58D',
        'brand-rose-metallic': '#B97C63',
        'brand-bronze': '#9D6A57',
        'brand-ivory': '#F8F2EE',
        'brand-sage-light': '#AEB09B',
        'brand-sage-dark': '#8C8E78',
        'brand-skin-light': '#EBC0A8',
        'brand-peach': '#F3D1BC',
        'brand-blue-tech': '#1185FE',
        'brand-blue-light': '#4AA3FF',
        'brand-charcoal': '#2C2C2E',
        'brand-warm-gray': '#F2F0EB',
      },
      fontFamily: {
        serif: ['PlayfairDisplay_400Regular', 'PlayfairDisplay_600SemiBold', 'PlayfairDisplay_700Bold', 'serif'],
        sans: ['Poppins_400Regular', 'Poppins_500Medium', 'Poppins_600SemiBold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
