import type {
  AccountKind,
  DriverDailyUsage,
  DriverTravelSelection,
  Principal,
  Role,
  Vehicle,
  VehicleComplianceDocument,
  VehicleHandover,
  VehicleHandoverImage,
  VehicleIssue,
} from "./domain.ts";

export type RefreshRow = {
  id: string;
  principalId: string;
  tokenHash: string;
  familyId: string;
  revoked: boolean;
  /** Absolute session end (ms since epoch); family start + 14 days (US-29). */
  expiresAt: number;
};

export type ChallengeRow = {
  tokenHash: string;
  principalId: string;
  expiresAt: number;
};

export type ResetRow = {
  tokenHash: string;
  principalId: string;
  expiresAt: number;
  used: boolean;
};

export type CompanyInsert = {
  id: string;
  accountKind: AccountKind;
  name: string;
  registrationNumber: string;
  vatNumber: string;
  address: string;
};

export interface Store {
  withTransaction<T>(fn: (s: Store) => Promise<T>): Promise<T>;
  insertCompany(company: CompanyInsert): Promise<void>;
  updateCompany(company: CompanyInsert): Promise<void>;
  findCompany(id: string): Promise<CompanyInsert | undefined>;
  insertPrincipal(p: Principal): Promise<void>;
  findPrincipalByEmail(email: string): Promise<Principal | undefined>;
  findPrincipalById(id: string): Promise<Principal | undefined>;
  findPrincipalByInviteHash(tokenHash: string): Promise<Principal | undefined>;
  updatePrincipal(p: Principal): Promise<void>;
  /** Physical remove; caller must clear principal-bound auth rows first. */
  deletePrincipal(id: string): Promise<void>;
  /** Revoke/delete refresh + challenge + reset rows for principal (US-27 / ADR-008). */
  clearPrincipalAuthSide(principalId: string): Promise<void>;
  listAdmins(companyId: string): Promise<Principal[]>;
  listDrivers(companyId: string): Promise<Principal[]>;
  insertRefresh(row: RefreshRow): Promise<void>;
  findRefreshByHash(tokenHash: string): Promise<RefreshRow | undefined>;
  revokeRefreshFamily(familyId: string): Promise<void>;
  revokeRefresh(tokenHash: string): Promise<void>;
  insertChallenge(row: ChallengeRow): Promise<void>;
  takeChallenge(tokenHash: string): Promise<ChallengeRow | undefined>;
  insertReset(row: ResetRow): Promise<void>;
  findReset(tokenHash: string): Promise<ResetRow | undefined>;
  markResetUsed(tokenHash: string): Promise<void>;
  insertVehicle(v: Vehicle): Promise<void>;
  updateVehicle(v: Vehicle): Promise<void>;
  findVehicle(id: string, companyId: string): Promise<Vehicle | undefined>;
  listVehicles(companyId: string): Promise<Vehicle[]>;
  counts(companyId: string): Promise<{ drivers: number; vehicles: number }>;
  findActiveDriverTravel(driverId: string): Promise<DriverTravelSelection | undefined>;
  deactivateDriverTravel(driverId: string): Promise<void>;
  insertDriverTravel(row: DriverTravelSelection): Promise<void>;
  deleteDriverTravelForDriver(driverId: string): Promise<void>;
  insertHandover(row: VehicleHandover): Promise<void>;
  updateHandover(row: VehicleHandover): Promise<void>;
  findHandover(id: string, companyId: string): Promise<VehicleHandover | undefined>;
  findOpenOutForDriver(driverId: string): Promise<VehicleHandover | undefined>;
  findOpenOutForVehicle(vehicleId: string, companyId: string): Promise<VehicleHandover | undefined>;
  listHandoversForVehicle(vehicleId: string, companyId: string): Promise<VehicleHandover[]>;
  insertHandoverImage(row: VehicleHandoverImage): Promise<void>;
  listHandoverImages(handoverId: string): Promise<VehicleHandoverImage[]>;
  countHandoverImages(handoverId: string): Promise<number>;
  voidOpenOutsForDriver(driverId: string): Promise<void>;
  insertDailyUsage(row: DriverDailyUsage): Promise<void>;
  listDailyUsageForDriver(driverId: string, companyId: string): Promise<DriverDailyUsage[]>;
  listDailyUsageForCompany(
    companyId: string,
    opts?: { from?: string; to?: string },
  ): Promise<DriverDailyUsage[]>;
  deleteDailyUsageForDriver(driverId: string): Promise<void>;
  insertComplianceDocument(row: VehicleComplianceDocument): Promise<void>;
  listComplianceDocuments(vehicleId: string, companyId: string): Promise<VehicleComplianceDocument[]>;
  findComplianceDocument(id: string, companyId: string): Promise<VehicleComplianceDocument | undefined>;
  deleteComplianceDocument(id: string, companyId: string): Promise<void>;
  countComplianceDocuments(vehicleId: string, companyId: string): Promise<number>;
  insertIssue(row: VehicleIssue): Promise<void>;
  updateIssue(row: VehicleIssue): Promise<void>;
  listIssuesForVehicle(vehicleId: string, companyId: string): Promise<VehicleIssue[]>;
  findIssue(id: string, companyId: string): Promise<VehicleIssue | undefined>;
  listLatestHandoversForCompany(companyId: string): Promise<VehicleHandover[]>;
  hasComplianceDigestSend(companyId: string, principalId: string, sentOn: string): Promise<boolean>;
  recordComplianceDigestSend(companyId: string, principalId: string, sentOn: string): Promise<void>;
  listOwnerAdminPrincipals(companyId: string): Promise<Principal[]>;
}

export class MemoryStore implements Store {
  companies = new Map<string, CompanyInsert>();
  principals = new Map<string, Principal>();
  emailIndex = new Map<string, string>();
  refresh = new Map<string, RefreshRow>();
  challenges = new Map<string, ChallengeRow>();
  resets = new Map<string, ResetRow>();
  vehicles = new Map<string, Vehicle>();
  driverTravel = new Map<string, DriverTravelSelection>();
  handovers = new Map<string, VehicleHandover>();
  handoverImages = new Map<string, VehicleHandoverImage>();
  dailyUsages = new Map<string, DriverDailyUsage>();
  complianceDocuments = new Map<string, VehicleComplianceDocument>();
  issues = new Map<string, VehicleIssue>();
  complianceDigestSends = new Set<string>();

  async withTransaction<T>(fn: (s: Store) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async insertCompany(company: CompanyInsert): Promise<void> {
    this.companies.set(company.id, { ...company });
  }

  async updateCompany(company: CompanyInsert): Promise<void> {
    if (!this.companies.has(company.id)) return;
    this.companies.set(company.id, { ...company });
  }

  async findCompany(id: string): Promise<CompanyInsert | undefined> {
    const row = this.companies.get(id);
    return row ? { ...row } : undefined;
  }

  async insertPrincipal(p: Principal): Promise<void> {
    if (this.emailIndex.has(p.email)) {
      const err = new Error("unique");
      (err as Error & { code: string }).code = "23505";
      throw err;
    }
    this.principals.set(p.id, { ...p });
    this.emailIndex.set(p.email, p.id);
  }

  async findPrincipalByEmail(email: string): Promise<Principal | undefined> {
    const id = this.emailIndex.get(email);
    return id ? { ...this.principals.get(id)! } : undefined;
  }

  async findPrincipalById(id: string): Promise<Principal | undefined> {
    const p = this.principals.get(id);
    return p ? { ...p } : undefined;
  }

  async findPrincipalByInviteHash(tokenHash: string): Promise<Principal | undefined> {
    for (const p of this.principals.values()) {
      if (p.inviteTokenHash === tokenHash) return { ...p };
    }
    return undefined;
  }

  async updatePrincipal(p: Principal): Promise<void> {
    const prev = this.principals.get(p.id);
    if (!prev) return;
    if (prev.email !== p.email) {
      if (this.emailIndex.has(p.email)) {
        const err = new Error("unique");
        (err as Error & { code: string }).code = "23505";
        throw err;
      }
      this.emailIndex.delete(prev.email);
      this.emailIndex.set(p.email, p.id);
    }
    this.principals.set(p.id, { ...p });
  }

  async deletePrincipal(id: string): Promise<void> {
    const prev = this.principals.get(id);
    if (!prev) return;
    this.principals.delete(id);
    if (this.emailIndex.get(prev.email) === id) this.emailIndex.delete(prev.email);
  }

  async clearPrincipalAuthSide(principalId: string): Promise<void> {
    for (const [hash, row] of this.refresh) {
      if (row.principalId === principalId) this.refresh.delete(hash);
    }
    for (const [hash, row] of this.challenges) {
      if (row.principalId === principalId) this.challenges.delete(hash);
    }
    for (const [hash, row] of this.resets) {
      if (row.principalId === principalId) this.resets.delete(hash);
    }
  }

  async listAdmins(companyId: string): Promise<Principal[]> {
    return [...this.principals.values()].filter(
      (p) => p.companyId === companyId && p.role === "admin",
    );
  }

  async listDrivers(companyId: string): Promise<Principal[]> {
    return [...this.principals.values()].filter(
      (p) => p.companyId === companyId && p.role === "driver",
    );
  }

  async insertRefresh(row: RefreshRow): Promise<void> {
    this.refresh.set(row.tokenHash, { ...row });
  }

  async findRefreshByHash(tokenHash: string): Promise<RefreshRow | undefined> {
    const row = this.refresh.get(tokenHash);
    return row ? { ...row } : undefined;
  }

  async revokeRefreshFamily(familyId: string): Promise<void> {
    for (const row of this.refresh.values()) {
      if (row.familyId === familyId) row.revoked = true;
    }
  }

  async revokeRefresh(tokenHash: string): Promise<void> {
    const row = this.refresh.get(tokenHash);
    if (row) row.revoked = true;
  }

  async insertChallenge(row: ChallengeRow): Promise<void> {
    this.challenges.set(row.tokenHash, { ...row });
  }

  async takeChallenge(tokenHash: string): Promise<ChallengeRow | undefined> {
    const row = this.challenges.get(tokenHash);
    if (!row) return undefined;
    this.challenges.delete(tokenHash);
    return { ...row };
  }

  async insertReset(row: ResetRow): Promise<void> {
    this.resets.set(row.tokenHash, { ...row });
  }

  async findReset(tokenHash: string): Promise<ResetRow | undefined> {
    const row = this.resets.get(tokenHash);
    return row ? { ...row } : undefined;
  }

  async markResetUsed(tokenHash: string): Promise<void> {
    const row = this.resets.get(tokenHash);
    if (row) row.used = true;
  }

  async insertVehicle(v: Vehicle): Promise<void> {
    this.vehicles.set(v.id, {
      ...v,
      customExpirations: v.customExpirations.map((row) => ({ ...row })),
    });
  }

  async updateVehicle(v: Vehicle): Promise<void> {
    this.vehicles.set(v.id, {
      ...v,
      customExpirations: v.customExpirations.map((row) => ({ ...row })),
    });
  }

  async findVehicle(id: string, companyId: string): Promise<Vehicle | undefined> {
    const v = this.vehicles.get(id);
    if (!v || v.companyId !== companyId) return undefined;
    return {
      ...v,
      customExpirations: v.customExpirations.map((row) => ({ ...row })),
    };
  }

  async listVehicles(companyId: string): Promise<Vehicle[]> {
    return [...this.vehicles.values()]
      .filter((v) => v.companyId === companyId)
      .map((v) => ({
        ...v,
        customExpirations: v.customExpirations.map((row) => ({ ...row })),
      }));
  }

  async counts(companyId: string): Promise<{ drivers: number; vehicles: number }> {
    const drivers = [...this.principals.values()].filter(
      (p) => p.companyId === companyId && p.role === "driver",
    ).length;
    const vehicles = [...this.vehicles.values()].filter((v) => v.companyId === companyId).length;
    return { drivers, vehicles };
  }

  async findActiveDriverTravel(driverId: string): Promise<DriverTravelSelection | undefined> {
    for (const row of this.driverTravel.values()) {
      if (row.driverId === driverId && row.active) return { ...row };
    }
    return undefined;
  }

  async deactivateDriverTravel(driverId: string): Promise<void> {
    for (const row of this.driverTravel.values()) {
      if (row.driverId === driverId && row.active) row.active = false;
    }
  }

  async insertDriverTravel(row: DriverTravelSelection): Promise<void> {
    this.driverTravel.set(row.id, { ...row });
  }

  async deleteDriverTravelForDriver(driverId: string): Promise<void> {
    for (const [id, row] of [...this.driverTravel.entries()]) {
      if (row.driverId === driverId) this.driverTravel.delete(id);
    }
  }

  async insertHandover(row: VehicleHandover): Promise<void> {
    if (row.type === "out" && row.status === "open") {
      for (const h of this.handovers.values()) {
        if (h.type === "out" && h.status === "open" && h.vehicleId === row.vehicleId) {
          const err = new Error("unique");
          (err as Error & { code: string }).code = "23505";
          throw err;
        }
        if (
          h.type === "out" &&
          h.status === "open" &&
          row.driverId &&
          h.driverId === row.driverId
        ) {
          const err = new Error("unique");
          (err as Error & { code: string }).code = "23505";
          throw err;
        }
      }
    }
    this.handovers.set(row.id, { ...row });
  }

  async updateHandover(row: VehicleHandover): Promise<void> {
    this.handovers.set(row.id, { ...row });
  }

  async findHandover(id: string, companyId: string): Promise<VehicleHandover | undefined> {
    const h = this.handovers.get(id);
    if (!h || h.companyId !== companyId) return undefined;
    return { ...h };
  }

  async findOpenOutForDriver(driverId: string): Promise<VehicleHandover | undefined> {
    for (const h of this.handovers.values()) {
      if (h.type === "out" && h.status === "open" && h.driverId === driverId) return { ...h };
    }
    return undefined;
  }

  async findOpenOutForVehicle(
    vehicleId: string,
    companyId: string,
  ): Promise<VehicleHandover | undefined> {
    for (const h of this.handovers.values()) {
      if (
        h.type === "out" &&
        h.status === "open" &&
        h.vehicleId === vehicleId &&
        h.companyId === companyId
      ) {
        return { ...h };
      }
    }
    return undefined;
  }

  async listHandoversForVehicle(
    vehicleId: string,
    companyId: string,
  ): Promise<VehicleHandover[]> {
    return [...this.handovers.values()]
      .filter((h) => h.vehicleId === vehicleId && h.companyId === companyId)
      .map((h) => ({ ...h }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async insertHandoverImage(row: VehicleHandoverImage): Promise<void> {
    this.handoverImages.set(row.id, { ...row });
  }

  async listHandoverImages(handoverId: string): Promise<VehicleHandoverImage[]> {
    return [...this.handoverImages.values()]
      .filter((img) => img.handoverId === handoverId)
      .map((img) => ({ ...img }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  }

  async countHandoverImages(handoverId: string): Promise<number> {
    let n = 0;
    for (const img of this.handoverImages.values()) {
      if (img.handoverId === handoverId) n += 1;
    }
    return n;
  }

  async voidOpenOutsForDriver(driverId: string): Promise<void> {
    const now = Date.now();
    for (const h of this.handovers.values()) {
      if (h.type === "out" && h.status === "open" && h.driverId === driverId) {
        h.status = "voided";
        h.voidedAt = now;
      }
    }
  }

  async insertDailyUsage(row: DriverDailyUsage): Promise<void> {
    this.dailyUsages.set(row.id, { ...row });
  }

  async listDailyUsageForDriver(
    driverId: string,
    companyId: string,
  ): Promise<DriverDailyUsage[]> {
    return [...this.dailyUsages.values()]
      .filter((u) => u.driverId === driverId && u.companyId === companyId)
      .map((u) => ({ ...u }))
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  }

  async deleteDailyUsageForDriver(driverId: string): Promise<void> {
    for (const [id, row] of this.dailyUsages) {
      if (row.driverId === driverId) this.dailyUsages.delete(id);
    }
  }

  async listDailyUsageForCompany(
    companyId: string,
    opts?: { from?: string; to?: string },
  ): Promise<DriverDailyUsage[]> {
    return [...this.dailyUsages.values()]
      .filter((u) => {
        if (u.companyId !== companyId) return false;
        if (opts?.from && u.usageDate < opts.from) return false;
        if (opts?.to && u.usageDate > opts.to) return false;
        return true;
      })
      .map((u) => ({ ...u }))
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  }

  async insertComplianceDocument(row: VehicleComplianceDocument): Promise<void> {
    this.complianceDocuments.set(row.id, { ...row });
  }

  async listComplianceDocuments(
    vehicleId: string,
    companyId: string,
  ): Promise<VehicleComplianceDocument[]> {
    return [...this.complianceDocuments.values()]
      .filter((d) => d.vehicleId === vehicleId && d.companyId === companyId)
      .map((d) => ({ ...d }))
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  }

  async findComplianceDocument(
    id: string,
    companyId: string,
  ): Promise<VehicleComplianceDocument | undefined> {
    const row = this.complianceDocuments.get(id);
    if (!row || row.companyId !== companyId) return undefined;
    return { ...row };
  }

  async deleteComplianceDocument(id: string, companyId: string): Promise<void> {
    const row = this.complianceDocuments.get(id);
    if (row && row.companyId === companyId) this.complianceDocuments.delete(id);
  }

  async countComplianceDocuments(vehicleId: string, companyId: string): Promise<number> {
    let n = 0;
    for (const d of this.complianceDocuments.values()) {
      if (d.vehicleId === vehicleId && d.companyId === companyId) n += 1;
    }
    return n;
  }

  async insertIssue(row: VehicleIssue): Promise<void> {
    this.issues.set(row.id, { ...row });
  }

  async updateIssue(row: VehicleIssue): Promise<void> {
    this.issues.set(row.id, { ...row });
  }

  async listIssuesForVehicle(vehicleId: string, companyId: string): Promise<VehicleIssue[]> {
    return [...this.issues.values()]
      .filter((i) => i.vehicleId === vehicleId && i.companyId === companyId)
      .map((i) => ({ ...i }))
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  }

  async findIssue(id: string, companyId: string): Promise<VehicleIssue | undefined> {
    const row = this.issues.get(id);
    if (!row || row.companyId !== companyId) return undefined;
    return { ...row };
  }

  async listLatestHandoversForCompany(companyId: string): Promise<VehicleHandover[]> {
    return [...this.handovers.values()]
      .filter((h) => h.companyId === companyId && h.status !== "voided")
      .map((h) => ({ ...h }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async hasComplianceDigestSend(
    companyId: string,
    principalId: string,
    sentOn: string,
  ): Promise<boolean> {
    return this.complianceDigestSends.has(`${companyId}|${principalId}|${sentOn}`);
  }

  async recordComplianceDigestSend(
    companyId: string,
    principalId: string,
    sentOn: string,
  ): Promise<void> {
    this.complianceDigestSends.add(`${companyId}|${principalId}|${sentOn}`);
  }

  async listOwnerAdminPrincipals(companyId: string): Promise<Principal[]> {
    return [...this.principals.values()]
      .filter((p) => p.companyId === companyId && (p.role === "owner" || p.role === "admin"))
      .map((p) => ({ ...p }));
  }

}

export function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505");
}

export type { Role };
