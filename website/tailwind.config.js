/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{js,css}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
