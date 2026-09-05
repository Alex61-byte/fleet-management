"use client";

import {
  FleetApiError,
  type Me,
  type Principal,
} from "@fleet/sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { browserTokens, markSessionEnded } from "./session";

type AuthState = {
  me: Me | null;
  ready: boolean;
  offline: boolean;
  applySession: (access: string, refresh: string, principal?: Principal) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const reload = useCallback(async () => {
    // US-29: refresh may exist after access expiry; SDK tryRefresh + me retry keep session.
    if (!browserTokens.getAccess() && !browserTokens.getRefresh()) {
      setMe(null);
      setReady(true);
      return;
    }
    if (!browserTokens.getAccess() && browserTokens.getRefresh()) {
      const ok = await api.tryRefresh();
      if (!ok) {
        markSessionEnded();
        setMe(null);
        setReady(true);
        return;
      }
    }
    try {
      const next = await api.me();
      setMe(next);
    } catch (err) {
      if (err instanceof FleetApiError && err.status === 401) {
        // SDK already attempted refresh; session truly ended.
        markSessionEnded();
        browserTokens.clear();
        setMe(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const applySession = useCallback(
    async (access: string, refresh: string) => {
      browserTokens.setTokens(access, refresh);
      await reload();
    },
    [reload],
  );

  const signOut = useCallback(async () => {
    const refresh = browserTokens.getRefresh();
    try {
      if (refresh) await api.logout(refresh);
    } catch {
      /* still clear local session */
    }
    browserTokens.clear();
    setMe(null);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // US-29: mid-session refresh failure must clear auth so shells route to sign-in.
  useEffect(() => {
    api.setOnSessionInvalid(() => {
      markSessionEnded();
      setMe(null);
    });
    return () => api.setOnSessionInvalid(null);
  }, []);

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const value = useMemo(
    () => ({ me, ready, offline, applySession, signOut, reload }),
    [me, ready, offline, applySession, signOut, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
