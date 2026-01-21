import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        cyan: {
          DEFAULT: "hsl(191 100% 50%)",
          50: "hsl(191 100% 95%)",
          100: "hsl(191 100% 90%)",
          200: "hsl(191 100% 80%)",
          300: "hsl(191 100% 70%)",
          400: "hsl(191 100% 60%)",
          500: "hsl(191 100% 50%)",
          600: "hsl(191 100% 40%)",
          700: "hsl(191 100% 30%)",
          800: "hsl(191 100% 20%)",
          900: "hsl(191 100% 10%)",
        },
        magenta: {
          DEFAULT: "hsl(300 100% 50%)",
          500: "hsl(300 100% 50%)",
        },
        surface: {
          DEFAULT: "hsl(240 10% 10%)",
          dark: "hsl(240 10% 5%)",
        },
      },
      boxShadow: {
        'cyan-sm': '0 2px 8px hsl(191 100% 50% / 0.1)',
        'cyan-md': '0 4px 16px hsl(191 100% 50% / 0.15)',
        'cyan-lg': '0 8px 32px hsl(191 100% 50% / 0.2)',
        'cyan-glow': '0 0 20px hsl(191 100% 50% / 0.3)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "color-pulse": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 rgba(139, 92, 246, 0)",
          },
          "50%": {
            opacity: "0.85",
            boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)",
          },
        },
        "expanding-waves": {
          "0%": {
            transform: "scale(1)",
            opacity: "0.6",
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "0.3",
          },
          "100%": {
            transform: "scale(1.1)",
            opacity: "0",
          },
        },
        "slideRight": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(400%)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "color-pulse": "color-pulse 2s ease-in-out infinite",
        "expanding-waves": "expanding-waves 2s ease-out infinite",
        "slideRight": "slideRight 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
