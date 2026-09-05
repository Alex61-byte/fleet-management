export type Role = "owner" | "admin" | "driver";
export type Client = "web" | "mobile";
export type WarningState = "expired" | "due_soon";
export type WarningField =
  | "insurance_on"
  | "inspection_on"
  | "road_tax_on"
  | "registration_on";

export type ApiErrorBody = { error: { code: string; message: string } };

export class FleetApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FleetApiError";
  }
}

export type Principal = {
  id: string;
  email: string;
  role: Role;
  company_id: string;
};

export type Me = Principal & {
  must_change_password: boolean;
  login_enabled: boolean;
  totp_enabled: boolean;
};

export type AuthSuccess = {
  status: "authenticated";
  principal: Principal;
  access_token: string;
  refresh_token: string;
  must_change_password: boolean;
};

export type TotpRequired = {
  status: "totp_required";
  challenge_token: string;
};

export type LoginResult = AuthSuccess | TotpRequired;

export type Driver = {
  id: string;
  email: string;
  must_change_password: boolean;
  login_enabled: boolean;
};

export type Warning = { field: WarningField; state: WarningState };

export const WARNING_FIELD_LABEL: Record<WarningField, string> = {
  insurance_on: "Insurance",
  inspection_on: "Inspection",
  road_tax_on: "Road tax",
  registration_on: "Registration",
};

export function warningA11y(plateOrCar: string, warnings: Warning[]): string {
  const parts = warnings.map(
    (w) =>
      `${WARNING_FIELD_LABEL[w.field].toLowerCase()} ${w.state === "expired" ? "expired" : "due soon"}`,
  );
  return parts.length ? `${plateOrCar}, ${parts.join(", ")}` : plateOrCar;
}

/** US-28 Vehicles nav/tab chrome — not list/detail `warnings` (30-day). */
export type VehiclesNavUrgency = "none" | "warning" | "critical";

/** Section dates for US-28 nav urgency + expiry (registration_on excluded). */
export const VEHICLE_SECTION_FIELDS: WarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
];

/** UTC calendar date `YYYY-MM-DD` — matches API `utcToday`. */
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Whole UTC calendar days from `todayIso` to `dateIso` (overdue ⇒ negative). */
export function daysUntilUtc(dateIso: string, todayIso = utcToday()): number {
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const [dy, dm, dd] = dateIso.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const dateMs = Date.UTC(dy, dm - 1, dd);
  return Math.round((dateMs - todayMs) / 86_400_000);
}

type VehicleSectionDates = Record<WarningField, string | null>;

/**
 * Fleet-wide worst-wins nav urgency from section dates (ADR-004 / US-28).
 * critical: any daysUntil &lt; 7 (incl. overdue); warning: else any daysUntil === 7; else none.
 * Do not derive from `warnings` (30-day only).
 */
export function vehiclesNavUrgency(
  vehicles: Iterable<VehicleSectionDates>,
  todayIso = utcToday(),
): VehiclesNavUrgency {
  let hasWarning = false;
  for (const vehicle of vehicles) {
    for (const field of VEHICLE_SECTION_FIELDS) {
      const value = vehicle[field];
      if (!value) continue;
      const days = daysUntilUtc(value, todayIso);
      if (days < 7) return "critical";
      if (days === 7) hasWarning = true;
    }
  }
  return hasWarning ? "warning" : "none";
}

export function vehiclesNavA11yLabel(urgency: VehiclesNavUrgency): string {
  switch (urgency) {
    case "critical":
      return "Vehicles, critical expiry within 7 days";
    case "warning":
      return "Vehicles, expiry in 7 days";
    default:
      return "Vehicles";
  }
}

/** List/home identity: "Make Model" with single space. */
export function vehicleLabel(v: { make: string; model: string }): string {
  return `${v.make} ${v.model}`.replace(/\s+/g, " ").trim();
}

export function mapAuthError(code: string, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Sign-in details are not correct.";
    case "validation_error":
      return "Check the email format and try again.";
    case "email_in_use":
      return "This email cannot be used.";
    case "password_too_short":
      return "At least 8 characters.";
    case "invite_invalid":
      return "This invitation is not valid.";
    case "email_not_invited":
      return "This email does not match the invitation.";
    case "invite_not_pending":
      return "This driver has already accepted their invitation.";
    case "totp_invalid":
      return "That code is not valid.";
    case "reset_invalid":
      return "This reset link is not valid. Request a new one.";
    case "login_disabled":
      return "Sign-in is disabled for this driver.";
    default:
      return fallback;
  }
}

export type Vehicle = {
  id: string;
  company_id: string;
  make: string;
  model: string;
  license_plate: string;
  country_of_registration: string | null;
  insurance_on: string | null;
  inspection_on: string | null;
  road_tax_on: string | null;
  registration_on: string | null;
  warnings: Warning[];
};

export type VehicleWrite = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
};

export type Home = {
  driver_count: number;
  vehicle_count: number;
  expiring_vehicles: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    warnings: Warning[];
  }[];
};

export type OdometerUnit = "mi" | "km";

export type DriverVehicle = {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  country_of_registration: string | null;
  odometer_unit: OdometerUnit;
  label: string;
};

export type DriverTravel = {
  id: string;
  vehicle_id: string;
  odometer: number;
  odometer_unit: OdometerUnit;
  created_at: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    label: string;
  } | null;
};

export function odometerUnitLabel(unit: OdometerUnit): string {
  return unit === "mi" ? "Miles" : "Kilometres";
}

export type TokenStore = {
  getAccess(): string | null;
  getRefresh(): string | null;
  setTokens(access: string, refresh: string): void;
  clear(): void;
};

async function readError(res: Response): Promise<FleetApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new FleetApiError(res.status, body.error.code, body.error.message);
  } catch {
    return new FleetApiError(res.status, "internal_error", "Unexpected error.");
  }
}

export class FleetClient {
  /** Single-flight refresh promise (US-29). */
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenStore,
  ) {}

  /**
   * Exchange stored refresh for a new token pair.
   * @returns true if tokens were updated; false if no refresh or refresh failed (tokens cleared).
   */
  async tryRefresh(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.runRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async runRefresh(): Promise<boolean> {
    const refresh = this.tokens.getRefresh();
    if (!refresh) {
      this.tokens.clear();
      return false;
    }
    try {
      const pair = await this.request<{ access_token: string; refresh_token: string }>(
        "POST",
        "/v1/auth/refresh",
        { body: { refresh_token: refresh }, auth: false, _skipRefresh: true },
      );
      this.tokens.setTokens(pair.access_token, pair.refresh_token);
      return true;
    } catch {
      this.tokens.clear();
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    opts?: { body?: unknown; auth?: boolean; empty?: boolean; _skipRefresh?: boolean; _retried?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts?.body !== undefined) headers["content-type"] = "application/json";
    if (opts?.auth !== false) {
      const access = this.tokens.getAccess();
      if (access) headers.authorization = `Bearer ${access}`;
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    // US-29: silent refresh once on authenticated 401, then retry.
    if (
      res.status === 401 &&
      opts?.auth !== false &&
      !opts?._skipRefresh &&
      !opts?._retried
    ) {
      const renewed = await this.tryRefresh();
      if (renewed) {
        return this.request<T>(method, path, { ...opts, _retried: true });
      }
      throw await readError(res);
    }

    if (res.status === 204 || res.status === 202) {
      if (!res.ok) throw await readError(res);
      const text = await res.text();
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return undefined as T;
      }
    }
    if (!res.ok) throw await readError(res);
    if (opts?.empty) return undefined as T;
    return (await res.json()) as T;
  }

  register(input: {
    email: string;
    password: string;
    registration_number: string;
    vat_number: string;
    address: string;
  }) {
    return this.request<Omit<AuthSuccess, "status">>("POST", "/v1/auth/register", {
      body: input,
      auth: false,
    });
  }

  login(email: string, password: string, client: Client) {
    return this.request<LoginResult>("POST", "/v1/auth/login", {
      body: { email, password, client },
      auth: false,
    });
  }

  verifyTotp(challenge_token: string, code: string) {
    return this.request<AuthSuccess>("POST", "/v1/auth/totp/verify", {
      body: { challenge_token, code },
      auth: false,
    });
  }

  forgotPassword(email: string) {
    return this.request<Record<string, never>>("POST", "/v1/auth/password/forgot", {
      body: { email },
      auth: false,
    });
  }

  resetPassword(token: string, password: string) {
    return this.request<void>("POST", "/v1/auth/password/reset", {
      body: { token, password },
      auth: false,
    });
  }

  refresh(refresh_token: string) {
    return this.request<{ access_token: string; refresh_token: string }>(
      "POST",
      "/v1/auth/refresh",
      { body: { refresh_token }, auth: false },
    );
  }

  me() {
    return this.request<Me>("GET", "/v1/me");
  }

  logout(refresh_token: string) {
    return this.request<void>("POST", "/v1/auth/logout", { body: { refresh_token } });
  }

  previewInvite(token: string) {
    return this.request<{ email: string; expires_at: string }>("POST", "/v1/auth/invite/preview", {
      body: { token },
      auth: false,
    });
  }

  acceptInvite(input: { token: string; email: string; password: string; client: Client }) {
    return this.request<AuthSuccess>("POST", "/v1/auth/invite/accept", {
      body: input,
      auth: false,
    });
  }

  totpStatus() {
    return this.request<{ enabled: boolean }>("GET", "/v1/auth/totp");
  }

  totpSetup() {
    return this.request<{ otpauth_url: string; secret: string }>("POST", "/v1/auth/totp/setup");
  }

  totpConfirm(code: string) {
    return this.request<void>("POST", "/v1/auth/totp/confirm", { body: { code } });
  }

  totpDisable(code: string) {
    return this.request<void>("POST", "/v1/auth/totp/disable", { body: { code } });
  }

  listAdmins() {
    return this.request<{ items: { id: string; email: string; role: "admin" }[] }>(
      "GET",
      "/v1/admins",
    );
  }

  createAdmin(email: string, password: string) {
    return this.request<{ id: string; email: string; role: "admin"; company_id: string }>(
      "POST",
      "/v1/admins",
      { body: { email, password } },
    );
  }

  listDrivers() {
    return this.request<{ items: Driver[] }>("GET", "/v1/drivers");
  }

  createDriver(email: string) {
    return this.request<Driver & { invite_email_sent: boolean }>("POST", "/v1/drivers", {
      body: { email },
    });
  }

  resendDriverInvite(id: string) {
    return this.request<{ invite_email_sent: boolean }>("POST", `/v1/drivers/${id}/invite/resend`);
  }

  getDriver(id: string) {
    return this.request<Driver>("GET", `/v1/drivers/${id}`);
  }

  patchDriver(id: string, patch: { email?: string; login_enabled?: boolean }) {
    return this.request<Driver>("PATCH", `/v1/drivers/${id}`, { body: patch });
  }

  /** US-27 — hard-delete driver profile (204). Not disable-login. */
  deleteDriver(id: string) {
    return this.request<void>("DELETE", `/v1/drivers/${id}`);
  }

  listVehicles(expiring?: boolean) {
    const q = expiring ? "?expiring=true" : "";
    return this.request<{ items: Vehicle[] }>("GET", `/v1/vehicles${q}`);
  }

  createVehicle(body: VehicleWrite) {
    return this.request<Vehicle>("POST", "/v1/vehicles", { body });
  }

  getVehicle(id: string) {
    return this.request<Vehicle>("GET", `/v1/vehicles/${id}`);
  }

  patchVehicle(id: string, body: VehicleWrite) {
    return this.request<Vehicle>("PATCH", `/v1/vehicles/${id}`, { body });
  }

  home() {
    return this.request<Home>("GET", "/v1/home");
  }

  listDriverVehicles() {
    return this.request<{ items: DriverVehicle[] }>("GET", "/v1/driver/vehicles");
  }

  getDriverTravel() {
    return this.request<{ travel: DriverTravel | null }>("GET", "/v1/driver/travel");
  }

  putDriverTravel(body: { vehicle_id: string; odometer: number | string }) {
    return this.request<DriverTravel>("PUT", "/v1/driver/travel", { body });
  }
}

export function memoryTokenStore(): TokenStore {
  let access: string | null = null;
  let refresh: string | null = null;
  return {
    getAccess: () => access,
    getRefresh: () => refresh,
    setTokens: (a, r) => {
      access = a;
      refresh = r;
    },
    clear: () => {
      access = null;
      refresh = null;
    },
  };
}
