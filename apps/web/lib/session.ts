import type { TokenStore } from "@fleet/sdk";

const ACCESS = "fleet.access";
const REFRESH = "fleet.refresh";
const SESSION_ENDED = "fleet.sessionEnded";

export const browserTokens: TokenStore = {
  getAccess() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS);
  },
  getRefresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH);
  },
  setTokens(access, refresh) {
    window.localStorage.setItem(ACCESS, access);
    window.localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    window.localStorage.removeItem(ACCESS);
    window.localStorage.removeItem(REFRESH);
  },
};

/** US-29 design: banner on sign-in after forced session end (not explicit sign-out). */
export function markSessionEnded() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_ENDED, "1");
}

export function takeSessionEndedMessage(): string | null {
  if (typeof window === "undefined") return null;
  if (window.sessionStorage.getItem(SESSION_ENDED) !== "1") return null;
  window.sessionStorage.removeItem(SESSION_ENDED);
  return "Your session ended. Sign in again to continue.";
}
