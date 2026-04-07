import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#08111f",
        steel: "#132238",
        ember: "#f59e0b",
        mist: "#d5dde8",
        frost: "#ebf2ff"
      },
      boxShadow: {
        panel: "0 18px 45px rgba(8, 17, 31, 0.35)"
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top, rgba(245, 158, 11, 0.18), transparent 40%), radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.12), transparent 32%)"
      }
    }
  },
  plugins: []
} satisfies Config;

