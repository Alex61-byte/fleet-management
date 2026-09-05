import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { DriverTravelSelection, Principal, Vehicle } from "../domain.ts";
import type { ChallengeRow, CompanyInsert, RefreshRow, ResetRow, Store } from "../store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function mapPrincipal(row: pg.QueryResultRow): Principal {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash ?? null,
    mustChangePassword: row.must_change_password,
    loginEnabled: row.login_enabled,
    totpEnabled: row.totp_enabled,
    totpSecret: row.totp_secret,
    totpPendingSecret: row.totp_pending_secret,
    inviteTokenHash: row.invite_token_hash ?? null,
    inviteExpiresAt: row.invite_expires_at
      ? new Date(row.invite_expires_at).getTime()
      : null,
  };
}

/**
 * node-pg returns DATE as a JS Date. `String(date).slice(0, 10)` is locale text
 * (e.g. "Thu Sep 1…"), not `YYYY-MM-DD`, so edit forms and warnings break.
 * Prefer ISO calendar day; accept already-normalized strings.
 */
export function pgDateToIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  }
  return null;
}

function mapVehicle(row: pg.QueryResultRow): Vehicle {
  return {
    id: row.id,
    companyId: row.company_id,
    make: row.make,
    model: row.model,
    licensePlate: row.license_plate,
    countryOfRegistration: row.country_of_registration,
    insuranceOn: pgDateToIso(row.insurance_on),
    inspectionOn: pgDateToIso(row.inspection_on),
    roadTaxOn: pgDateToIso(row.road_tax_on),
    registrationOn: pgDateToIso(row.registration_on),
  };
}

function mapDriverTravel(row: pg.QueryResultRow): DriverTravelSelection {
  return {
    id: row.id,
    companyId: row.company_id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    odometer: Number(row.odometer),
    odometerUnit: row.odometer_unit,
    active: Boolean(row.active),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

/** Pool options for local and Render-hosted Postgres (SSL required externally). */
export function poolConfig(connectionString: string): pg.PoolConfig {
  let sslmode: string | null = null;
  let hostname = "";
  try {
    const u = new URL(connectionString);
    sslmode = u.searchParams.get("sslmode");
    hostname = u.hostname;
  } catch {
    /* non-URL strings still go to pg as-is */
  }

  const hostIsRender = /(^|\.)render\.com$/i.test(hostname);
  const sslEnv = (process.env.DATABASE_SSL ?? process.env.PGSSLMODE ?? "").toLowerCase();
  const wantsSsl =
    sslEnv === "true" ||
    sslEnv === "1" ||
    sslEnv === "require" ||
    sslEnv === "verify-full" ||
    sslmode === "require" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full" ||
    hostIsRender;

  const max = Number(process.env.PG_POOL_MAX ?? 10);

  return {
    connectionString,
    // Render external certs: encrypt traffic; do not fail on chain (common for managed PG).
    ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
    max: Number.isFinite(max) && max > 0 ? max : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  };
}

export class PostgresStore implements Store {
  constructor(private readonly pool: pg.Pool) {}

  static async connect(url: string): Promise<PostgresStore> {
    const pool = new pg.Pool(poolConfig(url));
    pool.on("error", (err) => {
      console.error("@fleet/api postgres pool error", err.message);
    });
    const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
    await pool.query(sql);
    return new PostgresStore(pool);
  }

  async withTransaction<T>(fn: (s: Store) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inner = new PostgresStore(client as unknown as pg.Pool);
      const result = await fn(inner);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private q(text: string, params?: unknown[]) {
    return this.pool.query(text, params);
  }

  async insertCompany(company: CompanyInsert): Promise<void> {
    await this.q(
      `INSERT INTO companies (id, registration_number, vat_number, address)
       VALUES ($1,$2,$3,$4)`,
      [company.id, company.registrationNumber, company.vatNumber, company.address],
    );
  }

  async insertPrincipal(p: Principal): Promise<void> {
    await this.q(
      `INSERT INTO principals (
        id, company_id, email, role, password_hash, must_change_password,
        login_enabled, totp_enabled, totp_secret, totp_pending_secret,
        invite_token_hash, invite_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        CASE WHEN $12::bigint IS NULL THEN NULL ELSE to_timestamp($12/1000.0) END)`,
      [
        p.id,
        p.companyId,
        p.email,
        p.role,
        p.passwordHash,
        p.mustChangePassword,
        p.loginEnabled,
        p.totpEnabled,
        p.totpSecret,
        p.totpPendingSecret,
        p.inviteTokenHash,
        p.inviteExpiresAt,
      ],
    );
  }

  async findPrincipalByEmail(email: string): Promise<Principal | undefined> {
    const { rows } = await this.q("SELECT * FROM principals WHERE email = $1", [email]);
    return rows[0] ? mapPrincipal(rows[0]) : undefined;
  }

  async findPrincipalById(id: string): Promise<Principal | undefined> {
    const { rows } = await this.q("SELECT * FROM principals WHERE id = $1", [id]);
    return rows[0] ? mapPrincipal(rows[0]) : undefined;
  }

  async updatePrincipal(p: Principal): Promise<void> {
    await this.q(
      `UPDATE principals SET email=$2, password_hash=$3, must_change_password=$4,
        login_enabled=$5, totp_enabled=$6, totp_secret=$7, totp_pending_secret=$8,
        invite_token_hash=$9,
        invite_expires_at=CASE WHEN $10::bigint IS NULL THEN NULL ELSE to_timestamp($10/1000.0) END
       WHERE id=$1`,
      [
        p.id,
        p.email,
        p.passwordHash,
        p.mustChangePassword,
        p.loginEnabled,
        p.totpEnabled,
        p.totpSecret,
        p.totpPendingSecret,
        p.inviteTokenHash,
        p.inviteExpiresAt,
      ],
    );
  }

  async findPrincipalByInviteHash(tokenHash: string): Promise<Principal | undefined> {
    const { rows } = await this.q(
      "SELECT * FROM principals WHERE invite_token_hash = $1",
      [tokenHash],
    );
    return rows[0] ? mapPrincipal(rows[0]) : undefined;
  }

  async clearPrincipalAuthSide(principalId: string): Promise<void> {
    await this.q("DELETE FROM refresh_tokens WHERE principal_id=$1", [principalId]);
    await this.q("DELETE FROM totp_challenges WHERE principal_id=$1", [principalId]);
    await this.q("DELETE FROM password_resets WHERE principal_id=$1", [principalId]);
  }

  async deletePrincipal(id: string): Promise<void> {
    await this.q("DELETE FROM principals WHERE id=$1", [id]);
  }

  async listAdmins(companyId: string): Promise<Principal[]> {
    const { rows } = await this.q(
      "SELECT * FROM principals WHERE company_id=$1 AND role='admin'",
      [companyId],
    );
    return rows.map(mapPrincipal);
  }

  async listDrivers(companyId: string): Promise<Principal[]> {
    const { rows } = await this.q(
      "SELECT * FROM principals WHERE company_id=$1 AND role='driver'",
      [companyId],
    );
    return rows.map(mapPrincipal);
  }

  async insertRefresh(row: RefreshRow): Promise<void> {
    await this.q(
      `INSERT INTO refresh_tokens (id, principal_id, token_hash, family_id, revoked, expires_at)
       VALUES ($1,$2,$3,$4,$5,to_timestamp($6/1000.0))`,
      [row.id, row.principalId, row.tokenHash, row.familyId, row.revoked, row.expiresAt],
    );
  }

  async findRefreshByHash(tokenHash: string): Promise<RefreshRow | undefined> {
    const { rows } = await this.q("SELECT * FROM refresh_tokens WHERE token_hash=$1", [tokenHash]);
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: r.id,
      principalId: r.principal_id,
      tokenHash: r.token_hash,
      familyId: r.family_id,
      revoked: r.revoked,
      expiresAt: new Date(r.expires_at).getTime(),
    };
  }

  async revokeRefreshFamily(familyId: string): Promise<void> {
    await this.q("UPDATE refresh_tokens SET revoked=true WHERE family_id=$1", [familyId]);
  }

  async revokeRefresh(tokenHash: string): Promise<void> {
    await this.q("UPDATE refresh_tokens SET revoked=true WHERE token_hash=$1", [tokenHash]);
  }

  async insertChallenge(row: ChallengeRow): Promise<void> {
    await this.q(
      `INSERT INTO totp_challenges (token_hash, principal_id, expires_at)
       VALUES ($1,$2,to_timestamp($3/1000.0))`,
      [row.tokenHash, row.principalId, row.expiresAt],
    );
  }

  async takeChallenge(tokenHash: string): Promise<ChallengeRow | undefined> {
    const { rows } = await this.q(
      "DELETE FROM totp_challenges WHERE token_hash=$1 RETURNING *",
      [tokenHash],
    );
    const r = rows[0];
    if (!r) return undefined;
    return {
      tokenHash: r.token_hash,
      principalId: r.principal_id,
      expiresAt: new Date(r.expires_at).getTime(),
    };
  }

  async insertReset(row: ResetRow): Promise<void> {
    await this.q(
      `INSERT INTO password_resets (token_hash, principal_id, expires_at, used)
       VALUES ($1,$2,to_timestamp($3/1000.0),$4)`,
      [row.tokenHash, row.principalId, row.expiresAt, row.used],
    );
  }

  async findReset(tokenHash: string): Promise<ResetRow | undefined> {
    const { rows } = await this.q("SELECT * FROM password_resets WHERE token_hash=$1", [tokenHash]);
    const r = rows[0];
    if (!r) return undefined;
    return {
      tokenHash: r.token_hash,
      principalId: r.principal_id,
      expiresAt: new Date(r.expires_at).getTime(),
      used: r.used,
    };
  }

  async markResetUsed(tokenHash: string): Promise<void> {
    await this.q("UPDATE password_resets SET used=true WHERE token_hash=$1", [tokenHash]);
  }

  async insertVehicle(v: Vehicle): Promise<void> {
    await this.q(
      `INSERT INTO vehicles (
        id, company_id, make, model, license_plate, country_of_registration,
        insurance_on, inspection_on, road_tax_on, registration_on
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        v.id,
        v.companyId,
        v.make,
        v.model,
        v.licensePlate,
        v.countryOfRegistration,
        v.insuranceOn,
        v.inspectionOn,
        v.roadTaxOn,
        v.registrationOn,
      ],
    );
  }

  async updateVehicle(v: Vehicle): Promise<void> {
    await this.q(
      `UPDATE vehicles SET make=$2, model=$3, license_plate=$4, country_of_registration=$5,
        insurance_on=$6, inspection_on=$7, road_tax_on=$8, registration_on=$9
       WHERE id=$1`,
      [
        v.id,
        v.make,
        v.model,
        v.licensePlate,
        v.countryOfRegistration,
        v.insuranceOn,
        v.inspectionOn,
        v.roadTaxOn,
        v.registrationOn,
      ],
    );
  }

  async findVehicle(id: string, companyId: string): Promise<Vehicle | undefined> {
    const { rows } = await this.q(
      "SELECT * FROM vehicles WHERE id=$1 AND company_id=$2",
      [id, companyId],
    );
    return rows[0] ? mapVehicle(rows[0]) : undefined;
  }

  async listVehicles(companyId: string): Promise<Vehicle[]> {
    const { rows } = await this.q("SELECT * FROM vehicles WHERE company_id=$1", [companyId]);
    return rows.map(mapVehicle);
  }

  async counts(companyId: string): Promise<{ drivers: number; vehicles: number }> {
    const drivers = await this.q(
      "SELECT count(*)::int AS n FROM principals WHERE company_id=$1 AND role='driver'",
      [companyId],
    );
    const vehicles = await this.q("SELECT count(*)::int AS n FROM vehicles WHERE company_id=$1", [
      companyId,
    ]);
    return { drivers: drivers.rows[0].n, vehicles: vehicles.rows[0].n };
  }

  async findActiveDriverTravel(driverId: string): Promise<DriverTravelSelection | undefined> {
    const { rows } = await this.q(
      "SELECT * FROM driver_travel_selections WHERE driver_id=$1 AND active=true LIMIT 1",
      [driverId],
    );
    return rows[0] ? mapDriverTravel(rows[0]) : undefined;
  }

  async deactivateDriverTravel(driverId: string): Promise<void> {
    await this.q(
      "UPDATE driver_travel_selections SET active=false WHERE driver_id=$1 AND active=true",
      [driverId],
    );
  }

  async insertDriverTravel(row: DriverTravelSelection): Promise<void> {
    await this.q(
      `INSERT INTO driver_travel_selections
        (id, company_id, driver_id, vehicle_id, odometer, odometer_unit, active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp($8/1000.0))`,
      [
        row.id,
        row.companyId,
        row.driverId,
        row.vehicleId,
        row.odometer,
        row.odometerUnit,
        row.active,
        row.createdAt,
      ],
    );
  }

  async deleteDriverTravelForDriver(driverId: string): Promise<void> {
    await this.q("DELETE FROM driver_travel_selections WHERE driver_id=$1", [driverId]);
  }
}
