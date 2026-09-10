import type { Config } from "tailwindcss";
import { fleetTheme, themeClasses } from "../../design/tailwind.theme";

const safelist = [...new Set(Object.values(themeClasses).flatMap((classes) => classes.split(/\s+/)))];

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../design/tailwind.theme.ts"],
  safelist,
  darkMode: "class",
  theme: {
    extend: {
      colors: fleetTheme.colors,
      spacing: fleetTheme.spacing,
      fontSize: fleetTheme.fontSize as unknown as Record<string, [string, { lineHeight: string }]>,
      fontWeight: fleetTheme.fontWeight,
      fontFamily: { sans: [...fleetTheme.fontFamily.sans] },
      borderRadius: fleetTheme.borderRadius,
      boxShadow: fleetTheme.boxShadow,
      borderWidth: fleetTheme.borderWidth,
      underlineOffset: fleetTheme.underlineOffset,
      maxWidth: {
        "auth-card": fleetTheme.spacing["auth-card"],
        "public-content": fleetTheme.spacing["public-content-max"],
        "vehicle-side-slot": fleetTheme.spacing["vehicle-side-slot"],
        "vehicle-side-grid-max": fleetTheme.spacing["vehicle-side-grid-max"],
      },
      height: {
        "vehicle-side-slot": fleetTheme.spacing["vehicle-side-slot"],
        "vehicle-side-viewer-toolbar": fleetTheme.spacing["vehicle-side-viewer-toolbar"],
      },
      minHeight: { hit: "44px" },
      minWidth: { hit: "44px" },
    },
  },
  plugins: [],
};

export default config;
