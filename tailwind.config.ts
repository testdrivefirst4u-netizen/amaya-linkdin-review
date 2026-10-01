import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1B2A41", 2: "#24364F", line: "#3A4A63", track: "#2E4060" },
        brass: { DEFAULT: "#AD8A4E", soft: "#D9BF8C", dark: "#8C6D3A", wash: "#FBF6EC" },
        limestone: "#F2EDE3",
        paper: "#F7F5F0",
        ink: "#1B2A41",
        body: "#3A465A",
        muted: "#6A7385",
        line: "#E4DFD4",
        slate: "#5B7390",
        sage: "#6F8466",
        mast: { text: "#EDE8DE", muted: "#9AA3B3", sub: "#B9C0CC", ok: "#9ED3A9", no: "#F0A594" },
        fact: { fg: "#7C6230", bg: "#FBF6EC" },
        strat: { fg: "#4C6480", bg: "#EEF2F6" },
        insight: { fg: "#56694F", bg: "#EFF3EC" },
        cond: { fg: "#A5483A", bg: "#F9ECE8" },
        none: { fg: "#6A7385", bg: "#F1F0EC" },
        ok: { fg: "#3F7D5A", bg: "#E4F0E8" },
        no: { fg: "#A5483A", bg: "#F6E3DF" },
        wait: { fg: "#7C6230", bg: "#F1EBDD" },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", '"Times New Roman"', "serif"],
        sans: ["Jost", '"Segoe UI"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: { sq: "2px" },
      maxWidth: { page: "1180px" },
    },
  },
  plugins: [],
};

export default config;
