/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F09A37',      // Primary highlight orange from Figma
          orangeHover: '#D97706',
          blue: '#1A5F7A',        // Secondary highlight blue
          blueLight: '#3B82F6',
          darkBg: '#121212',      // Deep dark background for dark mode
          darkCard: '#1E1E1E',    // Dark card background
          darkText: '#E5E7EB',
          lightBg: '#F5F5F7',     // iOS-style light grey background
          lightCard: '#FFFFFF',
          lightText: '#1F2937',
        }
      }
    },
  },
  plugins: [],
}
