/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fiori: {
          blue: '#0a6ed1',
          'blue-dark': '#0854a0',
          bg: '#f5f7fa',
          header: '#354a5f',
          text: '#32363a',
          'text-light': '#6a6d70',
          card: '#ffffff',
          border: '#d9d9d9',
          success: '#107e3e',
          warning: '#e9730c',
          error: '#bb0000',
        }
      },
      fontFamily: {
        sans: ['"72"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 0 2px 0 rgba(0,0,0,0.1), 0 2px 5px 0 rgba(0,0,0,0.05)',
        'card-hover': '0 0 2px 0 rgba(0,0,0,0.1), 0 4px 10px 0 rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}
