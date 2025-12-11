/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: "#0f172a",
                    secondary: "#1e293b",
                    accent: "#334155",
                },
                text: {
                    primary: "#f8fafc",
                    secondary: "#94a3b8",
                },
                brand: {
                    DEFAULT: "#3b82f6",
                    hover: "#2563eb",
                },
                success: "#10b981",
                danger: "#ef4444",
                warning: "#f59e0b",
                border: "#334155",
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
