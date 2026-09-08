import { errors } from "./errors.ts";
import {
  newId,
  newTotpSecret,
  randomToken,
  sha256,
  totpUri,
  verifyAccessToken,
  verifyTotp,
} from "./crypto.ts";
import type { AccessClaims, Client, Principal } from "./domain.ts";
import { normalizeEmail, toPublicPrincipal } from "./domain.ts";
import { inviteUrlForToken, type Mailer } from "./mailer.ts";
import { isUniqueViolation, type Store } from "./store.ts";
import { authenticatedPayload, hashPassword, issueTokens, rotateRefresh, verifyPassword } from "./tokens.ts";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function requirePasswordLength(password: string) {
  if (password.normalize("NFKC").length < 8) throw errors.passwordTooShort();
}

function requireCompanyField(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) {
    throw errors.validation(`${label} is required.`);
  }
  return trimmed;
}

function mapUnique(err: unknown): never {
  if (isUniqueViolation(err)) throw errors.emailInUse();
  throw err;
}

function blankInviteFields(): Pick<Principal, "inviteTokenHash" | "inviteExpiresAt"> {
  return { inviteTokenHash: null, inviteExpiresAt: null };
}

export class IdentityService {
  constructor(
    private readonly store: Store,
    private readonly jwtSecret: Uint8Array,
    private readonly mailer: Mailer,
  ) {}

  async register(input: {
    email: string;
    password: string;
    registration_number: string;
    vat_number: string;
    address: string;
  }) {
    requirePasswordLength(input.password);
    const registrationNumber = requireCompanyField(input.registration_number, 64, "Registration number");
    const vatNumber = requireCompanyField(input.vat_number, 64, "VAT number");
    const address = requireCompanyField(input.address, 500, "Address");
    const normalized = normalizeEmail(input.email);
    const companyId = newId();
    const principal: Principal = {
      id: newId(),
      companyId,
      email: normalized,
      role: "owner",
      passwordHash: await hashPassword(input.password),
      mustChangePassword: false,
      loginEnabled: true,
      totpEnabled: false,
      totpSecret: null,
      totpPendingSecret: null,
      ...blankInviteFields(),
    };
    try {
      await this.store.withTransaction(async (tx) => {
        await tx.insertCompany({
          id: companyId,
          accountKind: "company",
          registrationNumber,
          vatNumber,
          address,
        });
        await tx.insertPrincipal(principal);
      });
    } catch (err) {
      mapUnique(err);
    }
    const tokens = await issueTokens(this.store, this.jwtSecret, principal);
    return {
      principal: toPublicPrincipal(principal, "company"),
      ...tokens,
      must_change_password: false,
    };
  }

  async registerIndividual(input: { email: string; password: string }) {
    requirePasswordLength(input.password);
    const normalized = normalizeEmail(input.email);
    if (!normalized) throw errors.validation("Email is required.");
    const companyId = newId();
    const principal: Principal = {
      id: newId(),
      companyId,
      email: normalized,
      role: "owner",
      passwordHash: await hashPassword(input.password),
      mustChangePassword: false,
      loginEnabled: true,
      totpEnabled: false,
      totpSecret: null,
      totpPendingSecret: null,
      ...blankInviteFields(),
    };
    try {
      await this.store.withTransaction(async (tx) => {
        await tx.insertCompany({
          id: companyId,
          accountKind: "individual",
          registrationNumber: "",
          vatNumber: "",
          address: "",
        });
        await tx.insertPrincipal(principal);
      });
    } catch (err) {
      mapUnique(err);
    }
    const tokens = await issueTokens(this.store, this.jwtSecret, principal);
    return {
      principal: toPublicPrincipal(principal, "individual"),
      ...tokens,
      must_change_password: false,
    };
  }

  async login(email: string, password: string, client: Client) {
    void client;
    const principal = await this.store.findPrincipalByEmail(normalizeEmail(email));
    if (!principal || !principal.passwordHash) {
      throw errors.invalidCredentials();
    }
    if (!(await verifyPassword(password, principal.passwordHash))) {
      throw errors.invalidCredentials();
    }
    if (principal.role === "driver" && !principal.loginEnabled) {
      throw errors.loginDisabled();
    }
    // Pending invite: must_change still true should not happen with password set;
    // if password exists, allow login with must_change false after accept.
    if (principal.role !== "driver" && principal.totpEnabled && principal.totpSecret) {
      const challenge = randomToken();
      await this.store.insertChallenge({
        tokenHash: sha256(challenge),
        principalId: principal.id,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
      });
      return { status: "totp_required" as const, challenge_token: challenge };
    }
    return authenticatedPayload(this.store, this.jwtSecret, principal);
  }

  async verifyTotpChallenge(challengeToken: string, code: string) {
    const row = await this.store.takeChallenge(sha256(challengeToken));
    if (!row || row.expiresAt < Date.now()) throw errors.totpInvalid();
    const principal = await this.store.findPrincipalById(row.principalId);
    if (!principal?.totpSecret || !verifyTotp(principal.totpSecret, code)) {
      throw errors.totpInvalid();
    }
    return authenticatedPayload(this.store, this.jwtSecret, principal);
  }

  async refresh(refreshToken: string) {
    const hash = sha256(refreshToken);
    const row = await this.store.findRefreshByHash(hash);
    if (!row) throw errors.unauthenticated();
    if (row.revoked) {
      await this.store.revokeRefreshFamily(row.familyId);
      throw errors.unauthenticated();
    }
    if (row.expiresAt <= Date.now()) {
      await this.store.revokeRefreshFamily(row.familyId);
      throw errors.unauthenticated();
    }
    const principal = await this.store.findPrincipalById(row.principalId);
    if (!principal) throw errors.unauthenticated();
    if (principal.role === "driver" && !principal.loginEnabled) {
      await this.store.revokeRefreshFamily(row.familyId);
      throw errors.unauthenticated();
    }
    return rotateRefresh(
      this.store,
      this.jwtSecret,
      refreshToken,
      principal,
      row.familyId,
      hash,
      row.expiresAt,
    );
  }

  async logout(refreshToken: string) {
    const row = await this.store.findRefreshByHash(sha256(refreshToken));
    if (row) await this.store.revokeRefreshFamily(row.familyId);
  }

  async forgotPassword(email: string): Promise<{ resetToken?: string }> {
    const principal = await this.store.findPrincipalByEmail(normalizeEmail(email));
    if (!principal || principal.role === "driver") return {};
    const token = randomToken();
    await this.store.insertReset({
      tokenHash: sha256(token),
      principalId: principal.id,
      expiresAt: Date.now() + RESET_TTL_MS,
      used: false,
    });
    return { resetToken: token };
  }

  async resetPassword(token: string, password: string) {
    requirePasswordLength(password);
    const row = await this.store.findReset(sha256(token));
    if (!row || row.used || row.expiresAt < Date.now()) throw errors.resetInvalid();
    const principal = await this.store.findPrincipalById(row.principalId);
    if (!principal || principal.role === "driver") throw errors.resetInvalid();
    principal.passwordHash = await hashPassword(password);
    await this.store.updatePrincipal(principal);
    await this.store.markResetUsed(row.tokenHash);
  }

  async me(claims: AccessClaims) {
    const principal = await this.requirePrincipal(claims.sub);
    const account_kind = await this.accountKindForCompany(principal.companyId);
    return {
      id: principal.id,
      email: principal.email,
      role: principal.role,
      company_id: principal.companyId,
      account_kind,
      must_change_password: principal.mustChangePassword,
      login_enabled: principal.loginEnabled,
      totp_enabled: principal.role === "driver" ? false : principal.totpEnabled,
    };
  }

  async previewInvite(token: string) {
    const principal = await this.resolveInvitePrincipal(token);
    if (!principal.loginEnabled) throw errors.loginDisabled();
    return {
      email: principal.email,
      expires_at: new Date(principal.inviteExpiresAt!).toISOString(),
    };
  }

  async acceptInvite(input: {
    token: string;
    email: string;
    password: string;
    client: Client;
  }) {
    void input.client;
    requirePasswordLength(input.password);
    const principal = await this.resolveInvitePrincipal(input.token);
    if (!principal.loginEnabled) throw errors.loginDisabled();
    if (normalizeEmail(input.email) !== principal.email) {
      throw errors.emailNotInvited();
    }
    principal.passwordHash = await hashPassword(input.password);
    principal.mustChangePassword = false;
    principal.inviteTokenHash = null;
    principal.inviteExpiresAt = null;
    await this.store.updatePrincipal(principal);
    return authenticatedPayload(this.store, this.jwtSecret, principal);
  }

  async totpStatus(claims: AccessClaims) {
    this.assertCompanyUser(claims);
    const principal = await this.requirePrincipal(claims.sub);
    return { enabled: principal.totpEnabled };
  }

  async totpSetup(claims: AccessClaims) {
    this.assertCompanyUser(claims);
    const principal = await this.requirePrincipal(claims.sub);
    const secret = newTotpSecret();
    principal.totpPendingSecret = secret;
    await this.store.updatePrincipal(principal);
    return { otpauth_url: totpUri(principal.email, secret), secret };
  }

  async totpConfirm(claims: AccessClaims, code: string) {
    this.assertCompanyUser(claims);
    const principal = await this.requirePrincipal(claims.sub);
    if (!principal.totpPendingSecret) throw errors.totpNotPending();
    if (!verifyTotp(principal.totpPendingSecret, code)) throw errors.totpInvalid();
    principal.totpSecret = principal.totpPendingSecret;
    principal.totpPendingSecret = null;
    principal.totpEnabled = true;
    await this.store.updatePrincipal(principal);
  }

  async totpDisable(claims: AccessClaims, code: string) {
    this.assertCompanyUser(claims);
    const principal = await this.requirePrincipal(claims.sub);
    if (!principal.totpEnabled || !principal.totpSecret || !verifyTotp(principal.totpSecret, code)) {
      throw errors.totpInvalid();
    }
    principal.totpEnabled = false;
    principal.totpSecret = null;
    principal.totpPendingSecret = null;
    await this.store.updatePrincipal(principal);
  }

  async listAdmins(claims: AccessClaims) {
    await this.assertCompanyTenantUser(claims);
    const items = await this.store.listAdmins(claims.company_id);
    return { items: items.map((p) => ({ id: p.id, email: p.email, role: "admin" as const })) };
  }

  async createAdmin(claims: AccessClaims, email: string, password: string) {
    await this.assertCompanyTenantUser(claims);
    if (claims.role !== "owner") throw errors.forbidden();
    requirePasswordLength(password);
    const principal: Principal = {
      id: newId(),
      companyId: claims.company_id,
      email: normalizeEmail(email),
      role: "admin",
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      loginEnabled: true,
      totpEnabled: false,
      totpSecret: null,
      totpPendingSecret: null,
      ...blankInviteFields(),
    };
    try {
      await this.store.insertPrincipal(principal);
    } catch (err) {
      mapUnique(err);
    }
    return {
      id: principal.id,
      email: principal.email,
      role: "admin" as const,
      company_id: principal.companyId,
    };
  }

  async listDrivers(claims: AccessClaims) {
    await this.assertCompanyTenantUser(claims);
    const items = await this.store.listDrivers(claims.company_id);
    return { items: items.map(driverJson) };
  }

  async createDriver(claims: AccessClaims, email: string) {
    await this.assertCompanyTenantUser(claims);
    const rawToken = randomToken();
    const principal: Principal = {
      id: newId(),
      companyId: claims.company_id,
      email: normalizeEmail(email),
      role: "driver",
      passwordHash: null,
      mustChangePassword: true,
      loginEnabled: true,
      totpEnabled: false,
      totpSecret: null,
      totpPendingSecret: null,
      inviteTokenHash: sha256(rawToken),
      inviteExpiresAt: Date.now() + INVITE_TTL_MS,
    };
    try {
      await this.store.insertPrincipal(principal);
    } catch (err) {
      mapUnique(err);
    }
    const invite_email_sent = await this.mailer.sendDriverInvite({
      to: principal.email,
      inviteUrl: inviteUrlForToken(rawToken),
    });
    return { ...driverJson(principal), invite_email_sent };
  }

  async resendDriverInvite(claims: AccessClaims, id: string) {
    await this.assertCompanyTenantUser(claims);
    const principal = await this.store.findPrincipalById(id);
    if (!principal || principal.role !== "driver" || principal.companyId !== claims.company_id) {
      throw errors.notFound();
    }
    if (!principal.mustChangePassword || principal.passwordHash) {
      throw errors.inviteNotPending();
    }
    const rawToken = randomToken();
    principal.inviteTokenHash = sha256(rawToken);
    principal.inviteExpiresAt = Date.now() + INVITE_TTL_MS;
    await this.store.updatePrincipal(principal);
    const invite_email_sent = await this.mailer.sendDriverInvite({
      to: principal.email,
      inviteUrl: inviteUrlForToken(rawToken),
    });
    return { invite_email_sent };
  }

  async getDriver(claims: AccessClaims, id: string) {
    await this.assertCompanyTenantUser(claims);
    const principal = await this.store.findPrincipalById(id);
    if (!principal || principal.role !== "driver" || principal.companyId !== claims.company_id) {
      throw errors.notFound();
    }
    return driverJson(principal);
  }

  async patchDriver(
    claims: AccessClaims,
    id: string,
    patch: { email?: string; login_enabled?: boolean },
  ) {
    await this.assertCompanyTenantUser(claims);
    const principal = await this.store.findPrincipalById(id);
    if (!principal || principal.role !== "driver" || principal.companyId !== claims.company_id) {
      throw errors.notFound();
    }
    if (patch.email !== undefined) principal.email = normalizeEmail(patch.email);
    if (patch.login_enabled !== undefined) principal.loginEnabled = patch.login_enabled;
    try {
      await this.store.updatePrincipal(principal);
    } catch (err) {
      mapUnique(err);
    }
    return driverJson(principal);
  }

  async deleteDriver(claims: AccessClaims, id: string): Promise<void> {
    await this.assertCompanyTenantUser(claims);
    const principal = await this.store.findPrincipalById(id);
    if (!principal || principal.role !== "driver" || principal.companyId !== claims.company_id) {
      throw errors.notFound();
    }
    await this.store.withTransaction(async (tx) => {
      await tx.voidOpenOutsForDriver(id);
      await tx.deleteDriverTravelForDriver(id);
      await tx.deleteDailyUsageForDriver(id);
      await tx.clearPrincipalAuthSide(id);
      await tx.deletePrincipal(id);
    });
  }

  async claimsFromAccess(token: string): Promise<AccessClaims> {
    try {
      return await verifyAccessToken(this.jwtSecret, token);
    } catch {
      throw errors.unauthenticated();
    }
  }

  async requireExistingPrincipal(id: string): Promise<void> {
    await this.requirePrincipal(id);
  }

  private async resolveInvitePrincipal(token: string): Promise<Principal> {
    if (!token?.trim()) throw errors.inviteInvalid();
    const principal = await this.store.findPrincipalByInviteHash(sha256(token));
    if (
      !principal ||
      principal.role !== "driver" ||
      !principal.mustChangePassword ||
      principal.passwordHash ||
      !principal.inviteExpiresAt ||
      principal.inviteExpiresAt < Date.now()
    ) {
      throw errors.inviteInvalid();
    }
    return principal;
  }

  private async requirePrincipal(id: string): Promise<Principal> {
    const principal = await this.store.findPrincipalById(id);
    if (!principal) throw errors.unauthenticated();
    return principal;
  }

  private assertCompanyUser(claims: AccessClaims) {
    if (claims.role === "driver") throw errors.forbidden();
  }

  /** Owner/Admin on a company-kind tenant only (Drivers/Admins — E75/E76). */
  private async assertCompanyTenantUser(claims: AccessClaims) {
    this.assertCompanyUser(claims);
    const kind = await this.accountKindForCompany(claims.company_id);
    if (kind !== "company") throw errors.forbidden();
  }

  private async accountKindForCompany(companyId: string) {
    const company = await this.store.findCompany(companyId);
    return company?.accountKind === "individual" ? "individual" : "company";
  }
}

function driverJson(p: Principal) {
  return {
    id: p.id,
    email: p.email,
    must_change_password: p.mustChangePassword,
    login_enabled: p.loginEnabled,
  };
}
