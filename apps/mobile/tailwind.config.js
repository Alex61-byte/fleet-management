const { fleetTheme, themeClasses } = require("../../design/tailwind.theme.ts");

const safelist = [...new Set(Object.values(themeClasses).flatMap((classes) => classes.split(/\s+/)))];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../design/tailwind.theme.ts"],
  safelist,
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: fleetTheme.colors,
      spacing: fleetTheme.spacing,
      fontSize: fleetTheme.fontSize,
      fontWeight: fleetTheme.fontWeight,
      fontFamily: fleetTheme.fontFamily,
      borderRadius: fleetTheme.borderRadius,
      maxWidth: {
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
