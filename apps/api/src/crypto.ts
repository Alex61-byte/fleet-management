import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { SignJWT, jwtVerify } from "jose";
import type { AccessClaims, Role } from "./domain.ts";

const ACCESS_TTL = "15m";
const REFRESH_BYTES = 32;
const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password.normalize("NFKC"), BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password.normalize("NFKC"), hash);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(): string {
  return randomBytes(REFRESH_BYTES).toString("base64url");
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function signAccessToken(
  secret: Uint8Array,
  claims: Omit<AccessClaims, "token_use">,
): Promise<string> {
  return new SignJWT({
    company_id: claims.company_id,
    role: claims.role,
    must_change_password: claims.must_change_password,
    ...(claims.account_kind ? { account_kind: claims.account_kind } : {}),
    token_use: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(
  secret: Uint8Array,
  token: string,
): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.token_use !== "access" || !payload.sub) {
    throw new Error("invalid access");
  }
  const kindRaw = payload.account_kind;
  const account_kind =
    kindRaw === "individual" || kindRaw === "company" ? kindRaw : undefined;
  return {
    sub: payload.sub,
    company_id: String(payload.company_id),
    role: payload.role as Role,
    must_change_password: Boolean(payload.must_change_password),
    account_kind,
    token_use: "access",
  };
}

export function newTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "Fleet", secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  return authenticator.check(code.replace(/\s/g, ""), secret);
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
