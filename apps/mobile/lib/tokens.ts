import * as SecureStore from "expo-secure-store";
import type { TokenStore } from "@fleet/sdk";

const ACCESS = "fleet.access";
const REFRESH = "fleet.refresh";

let accessMem: string | null = null;
let refreshMem: string | null = null;
/** US-29: set when silent refresh fails (not on explicit sign-out). */
let sessionEndedPending = false;

export const secureTokens: TokenStore = {
  getAccess: () => accessMem,
  getRefresh: () => refreshMem,
  setTokens(access, refresh) {
    accessMem = access;
    refreshMem = refresh;
    // SecureStore is unavailable on some web targets; memory still holds the session.
    void SecureStore.setItemAsync(ACCESS, access).catch(() => undefined);
    void SecureStore.setItemAsync(REFRESH, refresh).catch(() => undefined);
  },
  clear() {
    accessMem = null;
    refreshMem = null;
    void SecureStore.deleteItemAsync(ACCESS).catch(() => undefined);
    void SecureStore.deleteItemAsync(REFRESH).catch(() => undefined);
  },
};

export function markSessionEnded() {
  sessionEndedPending = true;
}

export function takeSessionEndedMessage(): string | null {
  if (!sessionEndedPending) return null;
  sessionEndedPending = false;
  return "Your session ended. Sign in again to continue.";
}

/**
 * Load tokens from SecureStore into memory.
 * Do not clobber a session that was set while this async read was in flight
 * (login/register can race startup hydrate on slow devices).
 */
export async function hydrateTokens() {
  try {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS),
      SecureStore.getItemAsync(REFRESH),
    ]);
    if (accessMem || refreshMem) return;
    accessMem = access;
    refreshMem = refresh;
  } catch {
    /* keep memory tokens if persistence is unavailable */
  }
}
