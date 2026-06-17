import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.08)",
      },
      colors: {
        surface: "#f8fafc",
        primary: "#4338ca",
        slate: {
          950: "#020617",
        },
      },
    },
  },
  plugins: [],
};

export default config;
