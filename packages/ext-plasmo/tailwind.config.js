/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: [
    "./components/**/*.{js,ts,jsx,tsx}",
    "./content.tsx",
    "./popup.tsx",
    "./background/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./core/**/*.{js,ts,jsx,tsx}",
    "./assets/**/*.{js,ts,jsx,tsx}",
    "./popup/**/*.{js,ts,jsx,tsx}",
    "./xnewfolderstructure/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      keyframes: {
        heightBlink: {
          '0%': { height: '0rem' },
          '50%': { height: '6rem' },
          '100%': { height: '0rem' },
        },
      },
      animation: {
        heightBlink: 'heightBlink 0.8s ease-in-out infinite',
      },
    }
  },
  plugins: []
}
