/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
         '2xl': '1536px',
        },
      },
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        primary: 'var(--primary)',
        main: 'var(--text-primary)',     // clean!
        muted: 'var(--text-secondary)',
        overlay: 'var(--overlay)',
        modal: 'var(--modal-background)',
      },
    },
  },
  plugins: [],
}