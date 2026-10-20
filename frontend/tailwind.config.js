/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4F9F5',
          100: '#E2F1E5',
          200: '#C5E3CE',
          500: '#1B8354',
          600: '#137A48',
          700: '#0E5C36',
          900: '#093B23',
        },
        surface: {
          bg: '#F8FAF7',
          card: '#FFFFFF',
          cardSubtle: '#F4F7F2',
          darkCard: '#1E2822'
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}