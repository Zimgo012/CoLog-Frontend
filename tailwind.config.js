/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-primary/20",
    "bg-secondary/20",
    "bg-accent/20",
    "bg-info/20",
    "bg-success/20",
    "bg-warning/20",
    "bg-error/20",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark", "cupcake"],
  },
}
