/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nano: {
          bg: '#09090b',
          surface: '#18181b',
          border: '#27272a',
          accent: '#a1a1aa',
          'accent-light': '#d4d4d8',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'PingFang SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
