/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Nunito', 'system-ui', 'sans-serif'],
        'serif': ['Pixelify Sans', 'Fredoka One', 'Nunito', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'title': ['Pixelify Sans', 'Fredoka One', 'sans-serif'],
        'body': ['Nunito', 'sans-serif'],
      },
      colors: {
        /* "purple" scale now maps to prairie wood-browns (kept name for class compat) */
        'purple': {
          900: '#1d1009',
          800: '#2a1a10',
          700: '#3b2417',
          600: '#4a2e1d',
          500: '#6b4226',
        },
        'primary': {
          400: '#ffd084',
          500: '#ffb648',
          600: '#e0763c',
        },
        'secondary': {
          400: '#5cc8c9',
          500: '#2ba4a6',
          600: '#1d7c7e',
        },
        'gold': {
          400: '#ffd084',
          500: '#ffb648',
          600: '#e0763c',
        },
        'lavender': {
          400: '#5cc8c9',
          500: '#2ba4a6',
          600: '#1d7c7e',
        },
      },
    },
  },
  plugins: [],
}
