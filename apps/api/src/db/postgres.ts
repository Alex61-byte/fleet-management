import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type {
  DriverDailyUsage,
  VehicleComplianceDocument,
  VehicleIssue,
  DriverTravelSelection,
  OdometerUnit,
  Principal,
  Vehicle,
  VehicleCustomExpiration,
  VehicleHandover,
  VehicleHandoverImage,
} from "../domain.ts";
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
 * node-pg returns DATE as a JS Date at **local** midnight for that calendar day.
 * `toISOString().slice(0, 10)` is UTC and shifts the day west of UTC (e.g. RO
 * 2026-09-07 → 2026-09-06). Use local Y-M-D for Date values; prefer a leading
 * `YYYY-MM-DD` on strings so opaque calendar dates never TZ-shift.
 */
export function pgDateToIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }
  return null;
}

function mapMileage(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function mapCustomExpirations(value: unknown): VehicleCustomExpiration[] {
  if (value == null) return [];
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: VehicleCustomExpiration[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const label = typeof row.label === "string" ? row.label : "";
    const expiresOn =
      typeof row.expires_on === "string"
        ? row.expires_on
        : typeof row.expiresOn === "string"
          ? row.expiresOn
          : "";
    if (!id || !label || !expiresOn) continue;
    out.push({ id, label, expiresOn });
  }
  return out;
}

function customExpirationsJson(rows: VehicleCustomExpiration[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      expires_on: row.expiresOn,
    })),
  );
}

function mapVehicle(row: pg.QueryResultRow): Vehicle {
  return {
    id: row.id,
    companyId: row.company_id,
    make: row.make,
    model: row.model,
    licensePlate: row.license_plate,
    countryOfRegistration: row.country_of_registration,
    mileage: mapMileage(row.mileage),
    insuranceOn: pgDateToIso(row.insurance_on),
    inspectionOn: pgDateToIso(row.inspection_on),
    roadTaxOn: pgDateToIso(row.road_tax_on),
    registrationOn: pgDateToIso(row.registration_on),
    customExpirations: mapCustomExpirations(row.custom_expirations),
    imageFrontPath: row.image_front_path ?? null,
    imageLeftPath: row.image_left_path ?? null,
    imageRightPath: row.image_right_path ?? null,
    imageBackPath: row.image_back_path ?? null,
  };
}

function mapTs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

function mapTsOrNull(value: unknown): number | null {
  if (value == null) return null;
  const t = mapTs(value);
  return t || null;
}

function mapHandover(row: pg.QueryResultRow): VehicleHandover {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id ?? null,
    type: row.type,
    status: row.status,
    handoverOutId: row.handover_out_id ?? null,
    mileage: mapMileage(row.mileage) ?? 0,
    mileageUnit: row.mileage_unit as OdometerUnit,
    nextServiceDays: Number(row.next_service_days),
    nextServiceDistance: mapMileage(row.next_service_distance) ?? 0,
    nextServiceDistanceUnit: row.next_service_distance_unit as OdometerUnit,
    damagesText: row.damages_text ?? null,
    createdAt: mapTs(row.created_at),
    closedAt: mapTsOrNull(row.closed_at),
    voidedAt: mapTsOrNull(row.voided_at),
  };
}

function mapHandoverImage(row: pg.QueryResultRow): VehicleHandoverImage {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    handoverId: row.handover_id,
    storagePath: row.storage_path,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: mapTs(row.created_at),
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
      `INSERT INTO companies (id, account_kind, name, registration_number, vat_number, address)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        company.id,
        company.accountKind,
        company.name,
        company.registrationNumber,
        company.vatNumber,
        company.address,
      ],
    );
  }

  async updateCompany(company: CompanyInsert): Promise<void> {
    await this.q(
      `UPDATE companies
       SET account_kind = $2, name = $3, registration_number = $4, vat_number = $5, address = $6
       WHERE id = $1`,
      [
        company.id,
        company.accountKind,
        company.name,
        company.registrationNumber,
        company.vatNumber,
        company.address,
      ],
    );
  }

  async findCompany(id: string): Promise<CompanyInsert | undefined> {
    const { rows } = await this.q(
      `SELECT id, account_kind, name, registration_number, vat_number, address
       FROM companies WHERE id = $1`,
      [id],
    );
    const row = rows[0] as
      | {
          id: string;
          account_kind: string;
          name: string | null;
          registration_number: string;
          vat_number: string;
          address: string;
        }
      | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      accountKind: row.account_kind === "individual" ? "individual" : "company",
      name: row.name ?? "",
      registrationNumber: row.registration_number ?? "",
      vatNumber: row.vat_number ?? "",
      address: row.address ?? "",
    };
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
        mileage,
        insurance_on, inspection_on, road_tax_on, registration_on,
        custom_expirations,
        image_front_path, image_left_path, image_right_path, image_back_path
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16)`,
      [
        v.id,
        v.companyId,
        v.make,
        v.model,
        v.licensePlate,
        v.countryOfRegistration,
        v.mileage,
        v.insuranceOn,
        v.inspectionOn,
        v.roadTaxOn,
        v.registrationOn,
        customExpirationsJson(v.customExpirations),
        v.imageFrontPath,
        v.imageLeftPath,
        v.imageRightPath,
        v.imageBackPath,
      ],
    );
  }

  async updateVehicle(v: Vehicle): Promise<void> {
    await this.q(
      `UPDATE vehicles SET make=$2, model=$3, license_plate=$4, country_of_registration=$5,
        mileage=$6,
        insurance_on=$7, inspection_on=$8, road_tax_on=$9, registration_on=$10,
        custom_expirations=$11::jsonb,
        image_front_path=$12, image_left_path=$13, image_right_path=$14, image_back_path=$15
       WHERE id=$1`,
      [
        v.id,
        v.make,
        v.model,
        v.licensePlate,
        v.countryOfRegistration,
        v.mileage,
        v.insuranceOn,
        v.inspectionOn,
        v.roadTaxOn,
        v.registrationOn,
        customExpirationsJson(v.customExpirations),
        v.imageFrontPath,
        v.imageLeftPath,
        v.imageRightPath,
        v.imageBackPath,
      ],
    );
  }

  async applyVehicleMileageMonotonic(
    id: string,
    companyId: string,
    mileage: number,
  ): Promise<
    | { status: "ok"; vehicle: Vehicle }
    | { status: "not_found" }
    | { status: "below_floor"; vehicle: Vehicle }
  > {
    // Lock when inside withTransaction so concurrent travel/handover writers serialize.
    const locked = await this.q(
      "SELECT * FROM vehicles WHERE id=$1 AND company_id=$2 FOR UPDATE",
      [id, companyId],
    );
    if (!locked.rows[0]) return { status: "not_found" };
    const current = mapVehicle(locked.rows[0]);
    if (current.mileage != null && mileage < current.mileage) {
      return { status: "below_floor", vehicle: current };
    }
    const { rows } = await this.q(
      `UPDATE vehicles SET mileage=$3
       WHERE id=$1 AND company_id=$2
       RETURNING *`,
      [id, companyId, mileage],
    );
    return { status: "ok", vehicle: mapVehicle(rows[0]!) };
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

  async insertHandover(row: VehicleHandover): Promise<void> {
    await this.q(
      `INSERT INTO vehicle_handovers (
        id, company_id, vehicle_id, driver_id, type, status, handover_out_id,
        mileage, mileage_unit, next_service_days, next_service_distance,
        next_service_distance_unit, damages_text, created_at, closed_at, voided_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        to_timestamp($14/1000.0),
        CASE WHEN $15::float8 IS NULL THEN NULL ELSE to_timestamp($15/1000.0) END,
        CASE WHEN $16::float8 IS NULL THEN NULL ELSE to_timestamp($16/1000.0) END
      )`,
      [
        row.id,
        row.companyId,
        row.vehicleId,
        row.driverId,
        row.type,
        row.status,
        row.handoverOutId,
        row.mileage,
        row.mileageUnit,
        row.nextServiceDays,
        row.nextServiceDistance,
        row.nextServiceDistanceUnit,
        row.damagesText,
        row.createdAt,
        row.closedAt,
        row.voidedAt,
      ],
    );
  }

  async updateHandover(row: VehicleHandover): Promise<void> {
    await this.q(
      `UPDATE vehicle_handovers SET
        driver_id=$2, type=$3, status=$4, handover_out_id=$5,
        mileage=$6, mileage_unit=$7, next_service_days=$8, next_service_distance=$9,
        next_service_distance_unit=$10, damages_text=$11,
        closed_at=CASE WHEN $12::float8 IS NULL THEN NULL ELSE to_timestamp($12/1000.0) END,
        voided_at=CASE WHEN $13::float8 IS NULL THEN NULL ELSE to_timestamp($13/1000.0) END
       WHERE id=$1`,
      [
        row.id,
        row.driverId,
        row.type,
        row.status,
        row.handoverOutId,
        row.mileage,
        row.mileageUnit,
        row.nextServiceDays,
        row.nextServiceDistance,
        row.nextServiceDistanceUnit,
        row.damagesText,
        row.closedAt,
        row.voidedAt,
      ],
    );
  }

  async findHandover(id: string, companyId: string): Promise<VehicleHandover | undefined> {
    const { rows } = await this.q(
      "SELECT * FROM vehicle_handovers WHERE id=$1 AND company_id=$2",
      [id, companyId],
    );
    return rows[0] ? mapHandover(rows[0]) : undefined;
  }

  async findOpenOutForDriver(driverId: string): Promise<VehicleHandover | undefined> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_handovers
       WHERE driver_id=$1 AND type='out' AND status='open'
       LIMIT 1`,
      [driverId],
    );
    return rows[0] ? mapHandover(rows[0]) : undefined;
  }

  async findOpenOutForVehicle(
    vehicleId: string,
    companyId: string,
  ): Promise<VehicleHandover | undefined> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_handovers
       WHERE vehicle_id=$1 AND company_id=$2 AND type='out' AND status='open'
       LIMIT 1`,
      [vehicleId, companyId],
    );
    return rows[0] ? mapHandover(rows[0]) : undefined;
  }

  async listOpenOutsForCompany(companyId: string): Promise<VehicleHandover[]> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_handovers
       WHERE company_id=$1 AND type='out' AND status='open'
       ORDER BY created_at ASC, id ASC`,
      [companyId],
    );
    return rows.map(mapHandover);
  }

  async listHandoversForVehicle(
    vehicleId: string,
    companyId: string,
  ): Promise<VehicleHandover[]> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_handovers
       WHERE vehicle_id=$1 AND company_id=$2
       ORDER BY created_at DESC`,
      [vehicleId, companyId],
    );
    return rows.map(mapHandover);
  }

  async insertHandoverImage(row: VehicleHandoverImage): Promise<void> {
    await this.q(
      `INSERT INTO vehicle_handover_images (
        id, company_id, vehicle_id, handover_id, storage_path, sort_order, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,to_timestamp($7/1000.0))`,
      [
        row.id,
        row.companyId,
        row.vehicleId,
        row.handoverId,
        row.storagePath,
        row.sortOrder,
        row.createdAt,
      ],
    );
  }

  async listHandoverImages(handoverId: string): Promise<VehicleHandoverImage[]> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_handover_images
       WHERE handover_id=$1
       ORDER BY sort_order ASC, created_at ASC`,
      [handoverId],
    );
    return rows.map(mapHandoverImage);
  }

  async countHandoverImages(handoverId: string): Promise<number> {
    const { rows } = await this.q(
      "SELECT count(*)::int AS n FROM vehicle_handover_images WHERE handover_id=$1",
      [handoverId],
    );
    return rows[0]?.n ?? 0;
  }

  async voidOpenOutsForDriver(driverId: string): Promise<void> {
    await this.q(
      `UPDATE vehicle_handovers
       SET status='voided', voided_at=now()
       WHERE driver_id=$1 AND type='out' AND status='open'`,
      [driverId],
    );
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

  async insertDailyUsage(row: DriverDailyUsage): Promise<void> {
    await this.q(
      `INSERT INTO driver_daily_usages
        (id, company_id, driver_id, vehicle_id, usage_date, status,
         start_place, end_place, start_distance, end_distance, distance_unit,
         start_time, end_time, refuel_amount, refuel_amount_unit, refuel_at_mileage,
         created_at, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               to_timestamp($17/1000.0),
               CASE WHEN $18::bigint IS NULL THEN NULL ELSE to_timestamp($18/1000.0) END)`,
      [
        row.id,
        row.companyId,
        row.driverId,
        row.vehicleId,
        row.usageDate,
        row.status,
        row.startPlace,
        row.endPlace,
        row.startDistance,
        row.endDistance,
        row.distanceUnit,
        row.startTime,
        row.endTime,
        row.refuelAmount,
        row.refuelAmountUnit,
        row.refuelAtMileage,
        row.createdAt,
        row.closedAt,
      ],
    );
  }

  async updateDailyUsage(row: DriverDailyUsage): Promise<void> {
    await this.q(
      `UPDATE driver_daily_usages SET
         status=$2, end_place=$3, end_distance=$4, end_time=$5,
         refuel_amount=$6, refuel_amount_unit=$7, refuel_at_mileage=$8,
         closed_at=CASE WHEN $9::bigint IS NULL THEN NULL ELSE to_timestamp($9/1000.0) END
       WHERE id=$1`,
      [
        row.id,
        row.status,
        row.endPlace,
        row.endDistance,
        row.endTime,
        row.refuelAmount,
        row.refuelAmountUnit,
        row.refuelAtMileage,
        row.closedAt,
      ],
    );
  }

  async findOpenDailyUsageForDriver(
    driverId: string,
    companyId: string,
  ): Promise<DriverDailyUsage | undefined> {
    const { rows } = await this.q(
      `SELECT id, company_id, driver_id, vehicle_id,
              to_char(usage_date, 'YYYY-MM-DD') AS usage_date, status,
              start_place, end_place, start_distance, end_distance, distance_unit,
              start_time, end_time, refuel_amount, refuel_amount_unit, refuel_at_mileage,
              created_at, closed_at
       FROM driver_daily_usages
       WHERE driver_id=$1 AND company_id=$2 AND status='open'
       LIMIT 1`,
      [driverId, companyId],
    );
    return rows[0] ? mapDailyUsage(rows[0]) : undefined;
  }

  async listDailyUsageForDriver(
    driverId: string,
    companyId: string,
  ): Promise<DriverDailyUsage[]> {
    const { rows } = await this.q(
      `SELECT id, company_id, driver_id, vehicle_id,
              to_char(usage_date, 'YYYY-MM-DD') AS usage_date, status,
              start_place, end_place, start_distance, end_distance, distance_unit,
              start_time, end_time, refuel_amount, refuel_amount_unit, refuel_at_mileage,
              created_at, closed_at
       FROM driver_daily_usages
       WHERE driver_id=$1 AND company_id=$2
       ORDER BY created_at DESC`,
      [driverId, companyId],
    );
    return rows.map(mapDailyUsage);
  }

  async deleteDailyUsageForDriver(driverId: string): Promise<void> {
    await this.q("DELETE FROM driver_daily_usages WHERE driver_id=$1", [driverId]);
  }

  async listDailyUsageForCompany(
    companyId: string,
    opts?: { from?: string; to?: string },
  ): Promise<DriverDailyUsage[]> {
    const params: unknown[] = [companyId];
    let sql = `SELECT id, company_id, driver_id, vehicle_id,
              to_char(usage_date, 'YYYY-MM-DD') AS usage_date, status,
              start_place, end_place, start_distance, end_distance, distance_unit,
              start_time, end_time, refuel_amount, refuel_amount_unit, refuel_at_mileage,
              created_at, closed_at
       FROM driver_daily_usages
       WHERE company_id=$1`;
    if (opts?.from) {
      params.push(opts.from);
      sql += ` AND usage_date >= $${params.length}`;
    }
    if (opts?.to) {
      params.push(opts.to);
      sql += ` AND usage_date <= $${params.length}`;
    }
    sql += ` ORDER BY created_at DESC`;
    const { rows } = await this.q(sql, params);
    return rows.map(mapDailyUsage);
  }

  async insertComplianceDocument(row: VehicleComplianceDocument): Promise<void> {
    await this.q(
      `INSERT INTO vehicle_compliance_documents
        (id, company_id, vehicle_id, doc_type, label, storage_path, content_type, byte_size, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9/1000.0))`,
      [
        row.id,
        row.companyId,
        row.vehicleId,
        row.docType,
        row.label,
        row.storagePath,
        row.contentType,
        row.byteSize,
        row.createdAt,
      ],
    );
  }

  async listComplianceDocuments(
    vehicleId: string,
    companyId: string,
  ): Promise<VehicleComplianceDocument[]> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_compliance_documents
       WHERE vehicle_id=$1 AND company_id=$2
       ORDER BY created_at DESC`,
      [vehicleId, companyId],
    );
    return rows.map(mapComplianceDoc);
  }

  async findComplianceDocument(
    id: string,
    companyId: string,
  ): Promise<VehicleComplianceDocument | undefined> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_compliance_documents WHERE id=$1 AND company_id=$2`,
      [id, companyId],
    );
    return rows[0] ? mapComplianceDoc(rows[0]) : undefined;
  }

  async deleteComplianceDocument(id: string, companyId: string): Promise<void> {
    await this.q(`DELETE FROM vehicle_compliance_documents WHERE id=$1 AND company_id=$2`, [
      id,
      companyId,
    ]);
  }

  async countComplianceDocuments(vehicleId: string, companyId: string): Promise<number> {
    const { rows } = await this.q(
      `SELECT count(*)::int AS n FROM vehicle_compliance_documents WHERE vehicle_id=$1 AND company_id=$2`,
      [vehicleId, companyId],
    );
    return Number(rows[0]?.n ?? 0);
  }

  async insertIssue(row: VehicleIssue): Promise<void> {
    await this.q(
      `INSERT INTO vehicle_issues
        (id, company_id, vehicle_id, created_by_principal_id, source, handover_id, title, description, status, created_at, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10/1000.0),$11)`,
      [
        row.id,
        row.companyId,
        row.vehicleId,
        row.createdByPrincipalId,
        row.source,
        row.handoverId,
        row.title,
        row.description,
        row.status,
        row.createdAt,
        row.closedAt != null ? new Date(row.closedAt).toISOString() : null,
      ],
    );
  }

  async updateIssue(row: VehicleIssue): Promise<void> {
    await this.q(
      `UPDATE vehicle_issues SET status=$3, closed_at=$4
       WHERE id=$1 AND company_id=$2`,
      [
        row.id,
        row.companyId,
        row.status,
        row.closedAt != null ? new Date(row.closedAt).toISOString() : null,
      ],
    );
  }

  async listIssuesForVehicle(vehicleId: string, companyId: string): Promise<VehicleIssue[]> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_issues WHERE vehicle_id=$1 AND company_id=$2
       ORDER BY created_at DESC`,
      [vehicleId, companyId],
    );
    return rows.map(mapIssue);
  }

  async findIssue(id: string, companyId: string): Promise<VehicleIssue | undefined> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_issues WHERE id=$1 AND company_id=$2`,
      [id, companyId],
    );
    return rows[0] ? mapIssue(rows[0]) : undefined;
  }

  async listLatestHandoversForCompany(companyId: string): Promise<VehicleHandover[]> {
    const { rows } = await this.q(
      `SELECT * FROM vehicle_handovers WHERE company_id=$1 AND status <> 'voided'
       ORDER BY created_at DESC`,
      [companyId],
    );
    return rows.map(mapHandover);
  }

  async hasComplianceDigestSend(
    companyId: string,
    principalId: string,
    sentOn: string,
  ): Promise<boolean> {
    const { rows } = await this.q(
      `SELECT 1 FROM compliance_digest_sends
       WHERE company_id=$1 AND principal_id=$2 AND sent_on=$3 LIMIT 1`,
      [companyId, principalId, sentOn],
    );
    return rows.length > 0;
  }

  async recordComplianceDigestSend(
    companyId: string,
    principalId: string,
    sentOn: string,
  ): Promise<void> {
    await this.q(
      `INSERT INTO compliance_digest_sends (company_id, principal_id, sent_on)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [companyId, principalId, sentOn],
    );
  }

  async listOwnerAdminPrincipals(companyId: string): Promise<Principal[]> {
    const { rows } = await this.q(
      `SELECT * FROM principals WHERE company_id=$1 AND role IN ('owner','admin')`,
      [companyId],
    );
    return rows.map(mapPrincipal);
  }

}

function mapDailyUsage(row: pg.QueryResultRow): DriverDailyUsage {
  return {
    id: row.id,
    companyId: row.company_id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    usageDate: pgDateToIso(row.usage_date) ?? "1970-01-01",
    status: (row.status as "open" | "closed") || "closed",
    startPlace: row.start_place,
    endPlace: row.end_place ?? null,
    startDistance: Number(row.start_distance),
    endDistance: row.end_distance == null ? null : Number(row.end_distance),
    distanceUnit: row.distance_unit as OdometerUnit,
    startTime: row.start_time,
    endTime: row.end_time ?? null,
    refuelAmount: row.refuel_amount == null ? null : Number(row.refuel_amount),
    refuelAmountUnit: (row.refuel_amount_unit as "L" | "gal" | null) ?? null,
    refuelAtMileage: row.refuel_at_mileage == null ? null : Number(row.refuel_at_mileage),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : null,
  };
}


function mapComplianceDoc(row: pg.QueryResultRow): VehicleComplianceDocument {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    docType: row.doc_type,
    label: row.label ?? "",
    storagePath: row.storage_path,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapIssue(row: pg.QueryResultRow): VehicleIssue {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    createdByPrincipalId: row.created_by_principal_id ?? null,
    source: row.source,
    handoverId: row.handover_id ?? null,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : null,
  };
}
