/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alabaster: '#EEEFE8',
        'moss-green': {
          light: '#8A9233',
          DEFAULT: '#4D521B',
          dark: '#3A3D14',
        },
        'ash-gray': {
          light: '#9FA092',
          DEFAULT: '#707166',
        },
        saffron: '#FBC657',
      }
    },
  },
  plugins: [],
}