/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
        colors: {
        brand: {
            DEFAULT: "hsl(var(--brand) / <alpha-value>)",
        },
        base: {
            100: "hsl(var(--base-100) / <alpha-value>)",
            200: "hsl(var(--base-200) / <alpha-value>) !important",
        },
        text: {
            black: "hsl(var(--black) / <alpha-value>)",
            white: "hsl(var(--white) / <alpha-value>)",
        },
        accent: {
          orange: "hsl(var(--accent-orange) / <alpha-value>)",
        },
        },
        borderRadius: { '2xl': '1.25rem' }
        },
    },
    plugins: []
}