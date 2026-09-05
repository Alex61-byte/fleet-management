import {
  hashPassword,
  newId,
  randomToken,
  sha256,
  signAccessToken,
  verifyPassword,
} from "./crypto.ts";
import type { Principal } from "./domain.ts";
import { toPublicPrincipal } from "./domain.ts";
import type { Store } from "./store.ts";

/** Absolute refresh-family lifetime (US-29 / ADR-002). */
export const REFRESH_FAMILY_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type TokenPair = {
  access_token: string;
  refresh_token: string;
};

export async function issueTokens(
  store: Store,
  jwtSecret: Uint8Array,
  principal: Principal,
): Promise<TokenPair> {
  const access_token = await signAccessToken(jwtSecret, {
    sub: principal.id,
    company_id: principal.companyId,
    role: principal.role,
    must_change_password: principal.mustChangePassword,
  });
  const refresh_token = randomToken();
  const now = Date.now();
  await store.insertRefresh({
    id: newId(),
    principalId: principal.id,
    tokenHash: sha256(refresh_token),
    familyId: newId(),
    revoked: false,
    expiresAt: now + REFRESH_FAMILY_TTL_MS,
  });
  return { access_token, refresh_token };
}

export async function rotateRefresh(
  store: Store,
  jwtSecret: Uint8Array,
  refreshToken: string,
  principal: Principal,
  familyId: string,
  oldHash: string,
  /** Family absolute end — copied on rotate; does not extend (US-29). */
  expiresAt: number,
): Promise<TokenPair> {
  await store.revokeRefresh(oldHash);
  const access_token = await signAccessToken(jwtSecret, {
    sub: principal.id,
    company_id: principal.companyId,
    role: principal.role,
    must_change_password: principal.mustChangePassword,
  });
  const refresh_token = randomToken();
  await store.insertRefresh({
    id: newId(),
    principalId: principal.id,
    tokenHash: sha256(refresh_token),
    familyId,
    revoked: false,
    expiresAt,
  });
  return { access_token, refresh_token };
}

export async function authenticatedPayload(
  store: Store,
  jwtSecret: Uint8Array,
  principal: Principal,
) {
  const tokens = await issueTokens(store, jwtSecret, principal);
  return {
    status: "authenticated" as const,
    principal: toPublicPrincipal(principal),
    ...tokens,
    must_change_password: principal.mustChangePassword,
  };
}

export { hashPassword, verifyPassword };
