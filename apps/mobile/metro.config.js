const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

function existingModule(dir, name) {
  const candidate = path.join(dir, name);
  return fs.existsSync(path.join(candidate, "package.json")) ? candidate : null;
}

const reactNativePath =
  existingModule(path.join(projectRoot, "node_modules"), "react-native") ||
  existingModule(path.join(monorepoRoot, "node_modules"), "react-native");
const reactPath =
  existingModule(path.join(projectRoot, "node_modules"), "react") ||
  existingModule(path.join(monorepoRoot, "node_modules"), "react");

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
  // expo-modules-core, expo-asset, etc. stay nested under expo/ when npm cannot
  // hoist them (React 19 mobile vs React 18 web). Hierarchical lookup is off.
  path.resolve(monorepoRoot, "node_modules/expo/node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ...(reactNativePath ? { "react-native": reactNativePath } : {}),
  ...(reactPath ? { react: reactPath } : {}),
};

// @fleet/sdk is TypeScript source (NodeNext uses `.js` import specifiers).
// Map those to the real `.ts` files so Metro can resolve monorepo SDK imports.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    typeof moduleName === "string" &&
    moduleName.startsWith(".") &&
    moduleName.endsWith(".js")
  ) {
    const tsCandidate = path.resolve(
      path.dirname(context.originModulePath),
      moduleName.replace(/\.js$/, ".ts"),
    );
    if (fs.existsSync(tsCandidate)) {
      return {
        type: "sourceFile",
        filePath: tsCandidate,
      };
    }
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
