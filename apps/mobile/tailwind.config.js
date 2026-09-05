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
      minHeight: { hit: "44px" },
      minWidth: { hit: "44px" },
    },
  },
  plugins: [],
};
