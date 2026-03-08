import type { Config } from "tailwindcss";

/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Aubergine Dark Theme Configuration
 * ─────────────────────────────────────────────────────────
 * Premium enterprise dark mode palette.
 * Deep blacks, crisp whites, aubergine accents.
 * Mathematically precise spacing and radius tokens.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Tremor module
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  /* ── Safelist Tremor chart fill/stroke colors ──
   * Tremor constructs fill/stroke classes dynamically via template
   * literals. Tailwind's JIT can't always detect them so we safelist. */
  safelist: [
    {
      pattern:
        /^(fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ["dark"],
    },
  ],
  theme: {
    extend: {
      /* ── Aubergine Monochrome Palette ── */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // ── Custom Aubergine Design Tokens ──
        aubergine: {
          50: "#f5f0f7",
          100: "#e8dced",
          200: "#d4bfdd",
          300: "#b894c5",
          400: "#9c6aad",
          500: "#7d4691",
          600: "#6b3580",
          700: "#572a68",
          800: "#482456",
          900: "#3b1f47",
          950: "#1e0d26",
        },
        surface: {
          0: "#000000",
          1: "#09090b",
          2: "#0f0f12",
          3: "#18181b",
          4: "#1e1e22",
          5: "#27272a",
        },
        status: {
          healthy: "#22c55e",
          warning: "#eab308",
          critical: "#ef4444",
          info: "#6366f1",
        },
      },

      /* ── Typography ── */
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },

      /* ── Border Radius ── */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* ── Box Shadows (enterprise dark mode) ── */
      boxShadow: {
        glow: "0 0 20px rgba(124, 58, 237, 0.15)",
        "glow-sm": "0 0 10px rgba(124, 58, 237, 0.1)",
        "glow-critical": "0 0 20px rgba(239, 68, 68, 0.2)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.4)",
        "card-rest": "0 1px 3px rgba(0, 0, 0, 0.3)",
      },

      /* ── Keyframe Animations ── */
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
