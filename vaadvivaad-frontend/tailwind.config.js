/** @type {import('tailwindcss').Config} */

// Semantic tokens resolve to the CSS custom properties declared in index.css,
// which flip on `html.dark`. Keeping the channels bare (`27 42 74`) is what
// lets the opacity modifiers work -- `text-content/60`, `border-line/12`.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic layer -- what new work should use.
        ground: token("ground"),
        surface: {
          DEFAULT: token("surface"),
          raised: token("surface-raised"),
          sunken: token("surface-sunken"),
        },
        content: token("content"),
        line: token("line"),
        accent: {
          DEFAULT: token("brass"),      // accent as text
          solid: token("brass-solid"),  // accent as a fill
          on: token("on-brass"),        // text on that fill
        },
        verdict: token("verdict"),
        dissent: token("dissent"),

        // Fixed brand values. The marketing and auth pages still use these, and
        // they stay literal because those pages are deliberately single-theme.
        ink: "#0B0E14",
        parchment: "#F7F3EA",
        "ink-blue": "#1B2A4A",
        brass: "#C7A046",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      transitionTimingFunction: {
        ui: "cubic-bezier(.2, .7, .3, 1)",
      },
      transitionDuration: {
        ui: "120ms",
        enter: "320ms",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".35" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "pulse-live": "pulse-live 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
