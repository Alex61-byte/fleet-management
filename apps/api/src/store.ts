import type { DriverTravelSelection, Principal, Role, Vehicle } from "./domain.ts";

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
  registrationNumber: string;
  vatNumber: string;
  address: string;
};

export interface Store {
  withTransaction<T>(fn: (s: Store) => Promise<T>): Promise<T>;
  insertCompany(company: CompanyInsert): Promise<void>;
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

  async withTransaction<T>(fn: (s: Store) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async insertCompany(company: CompanyInsert): Promise<void> {
    this.companies.set(company.id, { ...company });
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
    this.vehicles.set(v.id, { ...v });
  }

  async updateVehicle(v: Vehicle): Promise<void> {
    this.vehicles.set(v.id, { ...v });
  }

  async findVehicle(id: string, companyId: string): Promise<Vehicle | undefined> {
    const v = this.vehicles.get(id);
    if (!v || v.companyId !== companyId) return undefined;
    return { ...v };
  }

  async listVehicles(companyId: string): Promise<Vehicle[]> {
    return [...this.vehicles.values()].filter((v) => v.companyId === companyId);
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
}

export function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505");
}

export type { Role };
