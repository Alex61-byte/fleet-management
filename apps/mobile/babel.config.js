const { expoRouterBabelPlugin } = require("babel-preset-expo/build/plugins/expo-router-plugin");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    // babel-preset-expo only auto-adds this when `require.resolve("expo-router")`
    // succeeds from the repo root. npm nests it under apps/mobile (React 19 vs web 18).
    plugins: [expoRouterBabelPlugin],
  };
};
