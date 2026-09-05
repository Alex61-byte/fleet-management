import { FleetClient } from "@fleet/sdk";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { pickLanApiBase } from "./api-base";
import { secureTokens } from "./tokens";

export { hostFromExpoUri, pickLanApiBase } from "./api-base";

/**
 * Resolve API base for Expo Go / simulators / devices.
 * `localhost` is the device itself on physical phones and Android emulators.
 * Prefer EXPO_PUBLIC_API_URL; else Metro host LAN IP; else Android emulator loopback.
 */
export function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const lan = pickLanApiBase([
    Constants.expoConfig?.hostUri,
    Constants.experienceUrl,
    (Constants as { linkingUri?: string }).linkingUri,
  ]);
  if (lan) return lan;

  if (Platform.OS === "android") {
    // Host machine from Android emulator
    return "http://10.0.2.2:3001";
  }

  return "http://localhost:3001";
}

export const apiBase = resolveApiBase();
export const api = new FleetClient(apiBase, secureTokens);
