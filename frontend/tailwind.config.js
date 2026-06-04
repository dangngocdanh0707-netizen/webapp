/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        slate: {
          650: '#526071',
          750: '#293548',
        }
      }
    },
  },
  plugins: [],
}
