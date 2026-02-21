/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    tertiary: 'var(--bg-tertiary)',
                    accent: 'var(--bg-tertiary)',  // alias used for hover states
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                },
                brand: {
                    DEFAULT: 'var(--brand)',
                    subtle: 'var(--brand-subtle)',
                },
                success: 'var(--success)',
                danger: 'var(--danger)',
                warning: 'var(--warning)',
                border: 'var(--border)',
            },
            borderRadius: {
                sm: "6px",
                md: "12px",
                lg: "20px",
            },
        },
    },
    plugins: [],
}
