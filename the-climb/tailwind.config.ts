import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#131C2E",
        gold: "#E0A81C",
        golddk: "#B8860B",
        cream: "#F7F4ED",
        slate2: "#3E4A63",
        paper: "#F0EDE4",
      },
    },
  },
  plugins: [],
} satisfies Config;
