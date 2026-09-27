import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eafaf1",
          100: "#c7f2da",
          200: "#95e5bb",
          300: "#57d197",
          400: "#22b874",
          500: "#00a651", // Figma primary green
          600: "#059660", // Figma button hover
          700: "#04784e",
          800: "#065f40",
          900: "#064e35",
        },
        surface: {
          sidebar: "#FFFFFF",
          canvas: "#F4F4F5",
          card: "#FFFFFF",
          input: "#F4F4F6",
        },
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 4px 12px 0 rgba(0, 0, 0, 0.05)",
        modal: "0 20px 40px -15px rgba(0, 0, 0, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
