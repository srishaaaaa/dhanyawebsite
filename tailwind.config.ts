import type { Config } from "tailwindcss";

// Colours come from CSS variables (RGB triplets) so the owner can change the palette in Admin → Store settings
// without a redeploy. Defaults are set in globals.css.
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aubergine: c("aubergine"), plum: c("plum"), burgundy: c("burgundy"), ivory: c("ivory"),
        gold: c("gold"), rose: c("rose"), charcoal: c("charcoal"),
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { wordmark: "0.35em" },
    },
  },
  plugins: [],
};
export default config;
