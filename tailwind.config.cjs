/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
        },
        base: {
          100: 'hsl(var(--base-100) / <alpha-value>)',
          200: 'hsl(var(--base-200) / <alpha-value>)',
        },
        text: {
          black: 'hsl(var(--black) / <alpha-value>)',
          white: 'hsl(var(--white) / <alpha-value>)',
        },
        accent: {
          orange: 'hsl(var(--accent-orange) / <alpha-value>)',
        },
        button: {
          DEFAULT: 'hsl(var(--button) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Work Sans"', 'ui-sans-serif', 'system-ui'],
        heading: ['"Signika"', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: { '2xl': '1.25rem' },
    },
  },
  plugins: [
  ],
};
