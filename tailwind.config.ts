import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'background-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'background-shift': 'background-shift 10s ease infinite',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primaryColor: "#480689",
        secondaryColor: "#5805aa",
        buttonPrimaryColor : "#F36A35",
        buttonSecondaryColor : "#F38C3B",
        textPrimaryColor: "#e6f7fc"
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      width: {
        card: 'var(--card-width)',
      },
      height:{
        card: 'var(--card-height)',
      },
    },
  },
  plugins: [],
} satisfies Config;
