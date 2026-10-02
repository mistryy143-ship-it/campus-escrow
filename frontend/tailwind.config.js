/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        client:     { 50: "#eff6ff", 100: "#dbeafe", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
        freelancer: { 50: "#ecfdf5", 100: "#d1fae5", 500: "#10b981", 600: "#059669", 700: "#047857" },
        reviewer:   { 50: "#faf5ff", 100: "#f3e8ff", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce" },
      },
    },
  },
  plugins: [],
};
