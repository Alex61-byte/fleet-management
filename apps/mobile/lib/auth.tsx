import { FleetApiError, type Me, type Principal } from "@fleet/sdk";
import NetInfo from "@react-native-community/netinfo";
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
import { hydrateTokens, markSessionEnded, secureTokens } from "./tokens";

function meFromPrincipal(principal: Principal, mustChangePassword = false): Me {
  return {
    ...principal,
    must_change_password: mustChangePassword,
    login_enabled: true,
    totp_enabled: false,
  };
}

type AuthState = {
  me: Me | null;
  ready: boolean;
  offline: boolean;
  applySession: (
    access: string,
    refresh: string,
    principal?: Principal,
    mustChangePassword?: boolean,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const reload = useCallback(async () => {
    // US-29: persist login; renew access via refresh before clearing session.
    if (!secureTokens.getAccess() && !secureTokens.getRefresh()) {
      setMe(null);
      setReady(true);
      return;
    }
    if (!secureTokens.getAccess() && secureTokens.getRefresh()) {
      const ok = await api.tryRefresh();
      if (!ok) {
        markSessionEnded();
        setMe(null);
        setReady(true);
        return;
      }
    }
    try {
      setMe(await api.me());
    } catch (err) {
      if (err instanceof FleetApiError && err.status === 401) {
        // SDK already attempted refresh; session truly ended.
        markSessionEnded();
        secureTokens.clear();
        setMe(null);
      }
      // Network / 5xx: keep existing me (e.g. optimistic principal from login).
    } finally {
      setReady(true);
    }
  }, []);

  const applySession = useCallback(
    async (
      access: string,
      refresh: string,
      principal?: Principal,
      mustChangePassword = false,
    ) => {
      secureTokens.setTokens(access, refresh);
      // Set me before navigation so owner/driver layouts do not bounce to sign-in.
      if (principal) {
        setMe(meFromPrincipal(principal, mustChangePassword));
        setReady(true);
      }
      await reload();
    },
    [reload],
  );

  const signOut = useCallback(async () => {
    const refresh = secureTokens.getRefresh();
    try {
      if (refresh) await api.logout(refresh);
    } catch {
      /* local clear */
    }
    secureTokens.clear();
    setMe(null);
  }, []);

  useEffect(() => {
    void hydrateTokens().then(() => reload());
  }, [reload]);

  // US-29: mid-session refresh failure clears me; owner/driver layouts redirect to sign-in.
  useEffect(() => {
    api.setOnSessionInvalid(() => {
      markSessionEnded();
      setMe(null);
    });
    return () => api.setOnSessionInvalid(null);
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    void NetInfo.fetch().then((state) => setOffline(state.isConnected === false));
    return () => unsub();
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
