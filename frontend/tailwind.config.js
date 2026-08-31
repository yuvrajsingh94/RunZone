/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base brand & map palette
        night: '#14181A',
        panel: {
          DEFAULT: '#1B2023',
          light: '#23292D',
          dark: '#111416',
        },
        chalk: {
          DEFAULT: '#EDEEE7',
          muted: '#9BA1A6',
          dim: '#656C71',
        },
        cinder: {
          DEFAULT: '#B8492E',
          hover: '#A23E25',
          active: '#8F351E',
          subtle: 'rgba(184, 73, 46, 0.12)',
        },
        contour: {
          DEFAULT: '#3E8E7E',
          subtle: 'rgba(62, 142, 126, 0.14)',
        },
        'amber-contested': '#C98A2E',

        // Strictly scoped fatigue gauge palette
        gauge: {
          safe: '#5B9A4B',
          alert: '#D9932E',
          danger: '#C1432E',
        },

        // Hairlines
        hairline: {
          DEFAULT: 'rgba(237, 238, 231, 0.08)',
          strong: 'rgba(237, 238, 231, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Archivo', 'sans-serif'],
        numeric: ['Archivo', 'sans-serif'],
      },
      borderColor: {
        hairline: 'rgba(237, 238, 231, 0.08)',
        'hairline-strong': 'rgba(237, 238, 231, 0.15)',
      },
    },
  },
  plugins: [],
}
