/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // tu peux aussi mettre "media" si tu veux activer le mode sombre automatique
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "var(--nc-blue)",
          cyan: "var(--nc-cyan)",
          green: "var(--nc-green)",
          gray: "var(--nc-gray)",
          white: "var(--nc-white)",
          orange: "var(--nc-orange)",
          red: "var(--nc-red)",
        },
      },
      borderRadius: {
        xl: "var(--nc-radius)",
      },
      boxShadow: {
        card: "0 6px 18px rgba(0,0,0,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
