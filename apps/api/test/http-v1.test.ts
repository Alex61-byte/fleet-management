import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { authenticator } from "otplib";
import { buildApp } from "../src/app.ts";
import { IdentityService } from "../src/identity-service.ts";
import { MemoryStore } from "../src/store.ts";
import { addDays, utcToday } from "../src/domain.ts";
import { sha256 } from "../src/crypto.ts";
import type { InviteMail, Mailer } from "../src/mailer.ts";
import { MemoryVehicleImageStorage } from "../src/vehicle-image-storage.ts";

const secret = new TextEncoder().encode("test-secret");

class RecordingMailer implements Mailer {
  sent: InviteMail[] = [];
  failNext = false;
  async sendDriverInvite(mail: InviteMail): Promise<boolean> {
    this.sent.push(mail);
    if (this.failNext) {
      this.failNext = false;
      return false;
    }
    return true;
  }
  lastToken(): string {
    const url = this.sent.at(-1)!.inviteUrl;
    const u = new URL(url);
    return u.searchParams.get("token")!;
  }
}

const companyFields = {
  registration_number: "RO12345678",
  vat_number: "RO12345678",
  address: "1 Fleet Street, Bucharest",
};

type Inject = Awaited<ReturnType<typeof buildApp>>["inject"];

async function json(
  inject: Inject,
  opts: {
    method: string;
    url: string;
    payload?: unknown;
    token?: string;
  },
) {
  const res = await inject({
    method: opts.method,
    url: opts.url,
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    payload: opts.payload,
  });
  const body = res.body ? JSON.parse(res.body) : null;
  return { status: res.statusCode, body };
}

/** Minimal valid 1×1 GIF89a. */
const TINY_GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04,
  0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
  0x00, 0x3b,
]);

/** Minimal valid 1×1 PNG. */
const TINY_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe("HTTP /v1 first slice", () => {
  const store = new MemoryStore();
  const mailer = new RecordingMailer();
  const vehicleImages = new MemoryVehicleImageStorage();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let inject: Inject;

  before(async () => {
    app = await buildApp({ store, jwtSecret: secret, mailer, vehicleImages });
    inject = app.inject.bind(app);
  });

  after(async () => {
    await app.close();
  });

  it("US-01 register creates company owner and rejects duplicate email", async () => {
    const ok = await json(inject, {
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "owner@fleet.example", password: "password1", ...companyFields },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.principal.role, "owner");
    assert.equal(ok.body.principal.account_kind, "company");
    assert.equal(ok.body.must_change_password, false);
    assert.ok(ok.body.access_token);

    const me = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: ok.body.access_token,
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.account_kind, "company");

    const dup = await json(inject, {
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "owner@fleet.example", password: "password1", ...companyFields },
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, "email_in_use");
  });

  it("US-78 individual register creates individual owner; no legal fields; short password rejected", async () => {
    const short = await json(inject, {
      method: "POST",
      url: "/v1/auth/register/individual",
      payload: { email: "solo@fleet.example", password: "short" },
    });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.code, "password_too_short");

    const withLegal = await json(inject, {
      method: "POST",
      url: "/v1/auth/register/individual",
      payload: {
        email: "solo-legal@fleet.example",
        password: "password1",
        registration_number: "X",
      },
    });
    assert.equal(withLegal.status, 400);
    assert.equal(withLegal.body.error.code, "validation_error");

    const ok = await json(inject, {
      method: "POST",
      url: "/v1/auth/register/individual",
      payload: { email: "solo@fleet.example", password: "password1" },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.principal.role, "owner");
    assert.equal(ok.body.principal.account_kind, "individual");
    assert.equal(ok.body.must_change_password, false);
    assert.ok(ok.body.access_token);

    const me = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: ok.body.access_token,
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.account_kind, "individual");
    assert.equal(me.body.role, "owner");

    const login = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "solo@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.status, "authenticated");
    assert.equal(login.body.principal.account_kind, "individual");

    const dupCompany = await json(inject, {
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "solo@fleet.example", password: "password1", ...companyFields },
    });
    assert.equal(dupCompany.status, 409);
    assert.equal(dupCompany.body.error.code, "email_in_use");

    const dupInd = await json(inject, {
      method: "POST",
      url: "/v1/auth/register/individual",
      payload: { email: "owner@fleet.example", password: "password1" },
    });
    assert.equal(dupInd.status, 409);
    assert.equal(dupInd.body.error.code, "email_in_use");
  });

  it("US-82 individual owner forbidden on drivers and admins; can use vehicles", async () => {
    const reg = await json(inject, {
      method: "POST",
      url: "/v1/auth/register/individual",
      payload: { email: "solo-ops@fleet.example", password: "password1" },
    });
    assert.equal(reg.status, 201);
    const token = reg.body.access_token as string;

    const drivers = await json(inject, { method: "GET", url: "/v1/drivers", token });
    assert.equal(drivers.status, 403);
    assert.equal(drivers.body.error.code, "forbidden");

    const createDriver = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token,
      payload: { email: "nope@fleet.example" },
    });
    assert.equal(createDriver.status, 403);
    assert.equal(createDriver.body.error.code, "forbidden");

    const admins = await json(inject, { method: "GET", url: "/v1/admins", token });
    assert.equal(admins.status, 403);
    assert.equal(admins.body.error.code, "forbidden");

    const createAdmin = await json(inject, {
      method: "POST",
      url: "/v1/admins",
      token,
      payload: { email: "admin-nope@fleet.example", password: "password1" },
    });
    assert.equal(createAdmin.status, 403);
    assert.equal(createAdmin.body.error.code, "forbidden");

    const vehicle = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: {
        make: "Toyota",
        model: "Corolla",
        license_plate: "IND-01",
        country_of_registration: "RO",
        insurance_on: null,
        inspection_on: null,
        road_tax_on: null,
        registration_on: null,
      },
    });
    assert.equal(vehicle.status, 201);
    assert.equal(vehicle.body.license_plate, "IND-01");

    const home = await json(inject, { method: "GET", url: "/v1/home", token });
    assert.equal(home.status, 200);
    assert.equal(home.body.driver_count, 0);
    assert.equal(home.body.vehicle_count, 1);

    const vehicleId = vehicle.body.id as string;
    const sidePut = await inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "multipart/form-data; boundary=----indside",
      },
      payload:
        "------indside\r\n" +
        'Content-Disposition: form-data; name="file"; filename="front.png"\r\n' +
        "Content-Type: image/png\r\n\r\n" +
        "not-a-real-png-but-gate-runs-first\r\n" +
        "------indside--\r\n",
    });
    // Kind gate runs before multipart parse/type checks → 403 forbidden for individual.
    assert.equal(sidePut.statusCode, 403);
    assert.equal(JSON.parse(sidePut.body).error.code, "forbidden");

    const sideDel = await json(inject, {
      method: "DELETE",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      token,
    });
    assert.equal(sideDel.status, 403);
    assert.equal(sideDel.body.error.code, "forbidden");

    const handovers = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}/handovers`,
      token,
    });
    assert.equal(handovers.status, 403);
    assert.equal(handovers.body.error.code, "forbidden");
  });

  it("US-02 login web/mobile; wrong password is 401", async () => {
    const web = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(web.status, 200);
    assert.equal(web.body.status, "authenticated");

    const mobile = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "mobile" },
    });
    assert.equal(mobile.status, 200);

    const bad = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "wrongpass", client: "web" },
    });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.code, "invalid_credentials");
  });

  it("US-03 Owner/Admin password reset; driver cannot use reset", async () => {
    const ownerToken = (
      await json(inject, {
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "owner@fleet.example", password: "password1", client: "web" },
      })
    ).body.access_token;

    await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-reset@fleet.example" },
    });

    const forgotOwner = await json(inject, {
      method: "POST",
      url: "/v1/auth/password/forgot",
      payload: { email: "owner@fleet.example" },
    });
    assert.equal(forgotOwner.status, 202);

    const forgotDriver = await json(inject, {
      method: "POST",
      url: "/v1/auth/password/forgot",
      payload: { email: "driver-reset@fleet.example" },
    });
    assert.equal(forgotDriver.status, 202);

    const identity = new IdentityService(store, secret, mailer);
    const { resetToken } = await identity.forgotPassword("owner@fleet.example");
    assert.ok(resetToken);

    const resetBad = await json(inject, {
      method: "POST",
      url: "/v1/auth/password/reset",
      payload: { token: "bogus", password: "newpass12" },
    });
    assert.equal(resetBad.status, 400);
    assert.equal(resetBad.body.error.code, "reset_invalid");

    const resetOk = await json(inject, {
      method: "POST",
      url: "/v1/auth/password/reset",
      payload: { token: resetToken, password: "password1" },
    });
    assert.equal(resetOk.status, 204);
  });

  it("US-04/US-05 optional TOTP enable, challenge, disable", async () => {
    const login = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const token = login.body.access_token;

    const setup = await json(inject, { method: "POST", url: "/v1/auth/totp/setup", token });
    assert.equal(setup.status, 200);
    assert.ok(setup.body.secret);

    const stillOff = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(stillOff.body.status, "authenticated");

    const code = authenticator.generate(setup.body.secret);
    const confirm = await json(inject, {
      method: "POST",
      url: "/v1/auth/totp/confirm",
      token,
      payload: { code },
    });
    assert.equal(confirm.status, 204);

    const challenged = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(challenged.status, 200);
    assert.equal(challenged.body.status, "totp_required");
    assert.ok(challenged.body.challenge_token);

    const missing = await json(inject, {
      method: "POST",
      url: "/v1/auth/totp/verify",
      payload: { challenge_token: challenged.body.challenge_token, code: "000000" },
    });
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error.code, "totp_invalid");

    const challenged2 = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const goodCode = authenticator.generate(setup.body.secret);
    const verified = await json(inject, {
      method: "POST",
      url: "/v1/auth/totp/verify",
      payload: { challenge_token: challenged2.body.challenge_token, code: goodCode },
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.status, "authenticated");

    const disableCode = authenticator.generate(setup.body.secret);
    const disable = await json(inject, {
      method: "POST",
      url: "/v1/auth/totp/disable",
      token: verified.body.access_token,
      payload: { code: disableCode },
    });
    assert.equal(disable.status, 204);

    const after = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(after.body.status, "authenticated");
  });

  it("US-06 only owner creates admin; admin cannot", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const created = await json(inject, {
      method: "POST",
      url: "/v1/admins",
      token: owner.body.access_token,
      payload: { email: "admin@fleet.example", password: "adminpass" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.role, "admin");

    const adminLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "admin@fleet.example", password: "adminpass", client: "mobile" },
    });
    const denied = await json(inject, {
      method: "POST",
      url: "/v1/admins",
      token: adminLogin.body.access_token,
      payload: { email: "admin2@fleet.example", password: "adminpass" },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.code, "forbidden");
  });

  it("US-07/08/16 create edit disable driver; unique email", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const token = owner.body.access_token;

    const driver = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token,
      payload: { email: "driver@fleet.example" },
    });
    assert.equal(driver.status, 201);
    assert.equal(driver.body.must_change_password, true);
    assert.equal(driver.body.login_enabled, true);
    assert.equal(driver.body.invite_email_sent, true);

    const dup = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token,
      payload: { email: "driver@fleet.example" },
    });
    assert.equal(dup.status, 409);

    const patched = await json(inject, {
      method: "PATCH",
      url: `/v1/drivers/${driver.body.id}`,
      token,
      payload: { login_enabled: false },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.login_enabled, false);

    const disabledLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "anything1", client: "mobile" },
    });
    // Pending invite (no password) → invalid_credentials even when disabled
    assert.equal(disabledLogin.status, 401);
    assert.equal(disabledLogin.body.error.code, "invalid_credentials");

    await json(inject, {
      method: "PATCH",
      url: `/v1/drivers/${driver.body.id}`,
      token,
      payload: { login_enabled: true },
    });
  });

  it("driver invite accepts surrounding spaces on email", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const token = owner.body.access_token;

    const created = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token,
      payload: {
        email: "  spaced-driver@fleet.example  ",
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.email, "spaced-driver@fleet.example");

    const inviteToken = mailer.lastToken();
    const preview = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/preview",
      payload: { token: inviteToken },
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.email, "spaced-driver@fleet.example");

    const accept = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "  Spaced-Driver@fleet.example  ",
        password: "driver-pass",
        client: "mobile",
      },
    });
    assert.equal(accept.status, 200);
    assert.equal(accept.body.must_change_password, false);
    assert.equal(accept.body.principal.email, "spaced-driver@fleet.example");
    assert.equal(accept.body.principal.role, "driver");
  });

  it("US-09/10 invite accept web+mobile, pending login denied, later login", async () => {
    // driver@fleet.example was created in US-07; get a fresh invite via resend
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const list = await json(inject, {
      method: "GET",
      url: "/v1/drivers",
      token: owner.body.access_token,
    });
    const driverRow = (list.body.items as { id: string; email: string }[]).find(
      (d) => d.email === "driver@fleet.example",
    );
    assert.ok(driverRow);

    const resent = await json(inject, {
      method: "POST",
      url: `/v1/drivers/${driverRow!.id}/invite/resend`,
      token: owner.body.access_token,
    });
    assert.equal(resent.status, 200);
    assert.equal(resent.body.invite_email_sent, true);
    const inviteToken = mailer.lastToken();

    const pendingLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "anything1", client: "mobile" },
    });
    assert.equal(pendingLogin.status, 401);
    assert.equal(pendingLogin.body.error.code, "invalid_credentials");

    const badEmail = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "unknown@fleet.example",
        password: "new-driver",
        client: "web",
      },
    });
    assert.equal(badEmail.status, 400);
    assert.equal(badEmail.body.error.code, "email_not_invited");

    const short = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "driver@fleet.example",
        password: "short",
        client: "mobile",
      },
    });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.code, "password_too_short");

    const accepted = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "driver@fleet.example",
        password: "new-driver",
        client: "mobile",
      },
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.must_change_password, false);
    assert.equal(accepted.body.principal.role, "driver");
    assert.ok(accepted.body.access_token);

    const reusedToken = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "driver@fleet.example",
        password: "new-driver2",
        client: "web",
      },
    });
    assert.equal(reusedToken.status, 400);
    assert.equal(reusedToken.body.error.code, "invite_invalid");

    const next = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    assert.equal(next.status, 200);
    assert.equal(next.body.must_change_password, false);
    assert.equal(next.body.principal.role, "driver");

    const nextWeb = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "web" },
    });
    assert.equal(nextWeb.status, 200);
    assert.equal(nextWeb.body.must_change_password, false);
    assert.equal(nextWeb.body.principal.role, "driver");

    const me = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: nextWeb.body.access_token,
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.role, "driver");
  });

  it("US-11/12/13 vehicles + warnings; registration_on not warned", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const token = owner.body.access_token;
    const today = utcToday();

    const created = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: {
        make: "Ford",
        model: "Transit",
        license_plate: "B-01-FLE",
        country_of_registration: "RO",
        insurance_on: addDays(today, -1),
        inspection_on: addDays(today, 10),
        road_tax_on: addDays(today, 60),
        registration_on: null,
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.make, "Ford");
    assert.equal(created.body.model, "Transit");
    assert.equal(created.body.mileage, null);
    assert.equal(created.body.mileage_unit, "km");
    assert.equal(created.body.has_side_images, false);
    assert.equal(created.body.side_images.FRONT, null);
    const states = Object.fromEntries(created.body.warnings.map((w: { field: string; state: string }) => [w.field, w.state]));
    assert.equal(states.insurance_on, "expired");
    assert.equal(states.inspection_on, "due_soon");
    assert.equal(states.road_tax_on, undefined);

    const regOnly = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: {
        make: "Classic",
        model: "Roadster",
        license_plate: "B-99-REG",
        country_of_registration: "RO",
        insurance_on: addDays(today, 90),
        inspection_on: addDays(today, 90),
        road_tax_on: addDays(today, 90),
        registration_on: addDays(today, -365),
      },
    });
    assert.equal(regOnly.status, 201);
    assert.equal(regOnly.body.registration_on, addDays(today, -365));
    assert.equal(regOnly.body.warnings.length, 0);
    assert.equal(
      regOnly.body.warnings.some((w: { field: string }) => w.field === "registration_on"),
      false,
    );

    const patched = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${created.body.id}`,
      token,
      payload: { license_plate: "B-02-FLE" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.license_plate, "B-02-FLE");

    const list = await json(inject, { method: "GET", url: "/v1/vehicles?expiring=true", token });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].id, created.body.id);

    const home = await json(inject, { method: "GET", url: "/v1/home", token });
    assert.equal(home.body.vehicle_count, 2);
    assert.equal(home.body.expiring_vehicles.length, 1);
  });

  it("US-14/15 unauthenticated and driver cannot manage fleet", async () => {
    const anon = await json(inject, { method: "GET", url: "/v1/vehicles" });
    assert.equal(anon.status, 401);

    const driver = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    const create = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: driver.body.access_token,
      payload: { make: "Nope", model: "X", license_plate: "X" },
    });
    assert.equal(create.status, 403);
  });

  it("cross-company vehicle is not_found", async () => {
    const other = await json(inject, {
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "other@fleet.example", password: "password1", ...companyFields },
    });
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const vehicles = await json(inject, { method: "GET", url: "/v1/vehicles", token: owner.body.access_token });
    const id = vehicles.body.items[0].id;
    const peek = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${id}`,
      token: other.body.access_token,
    });
    assert.equal(peek.status, 404);
    assert.equal(peek.body.error.code, "not_found");
  });

  it("US-27 hard delete driver: authz, sessions, email reuse, vehicles, home count", async () => {
    const ownerLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const ownerToken = ownerLogin.body.access_token;

    const adminLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "admin@fleet.example", password: "adminpass", client: "web" },
    });
    const adminToken = adminLogin.body.access_token;

    const keep = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-keep@fleet.example" },
    });
    assert.equal(keep.status, 201);

    const doomed = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-delete@fleet.example" },
    });
    assert.equal(doomed.status, 201);
    const doomedId = doomed.body.id as string;

    const disabledThenDelete = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-disabled-del@fleet.example" },
    });
    assert.equal(disabledThenDelete.status, 201);

    const homeBefore = await json(inject, { method: "GET", url: "/v1/home", token: ownerToken });
    assert.equal(homeBefore.status, 200);
    const driversBefore = homeBefore.body.driver_count as number;
    const vehiclesBefore = homeBefore.body.vehicle_count as number;
    assert.ok(driversBefore >= 3);

    const vehiclesBeforeList = await json(inject, {
      method: "GET",
      url: "/v1/vehicles",
      token: ownerToken,
    });
    assert.equal(vehiclesBeforeList.status, 200);
    const vehicleIdsBefore = (vehiclesBeforeList.body.items as { id: string }[]).map((v) => v.id);

    // Pending driver cannot establish session before delete
    const driverSession = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver-delete@fleet.example", password: "temp-del1", client: "mobile" },
    });
    assert.equal(driverSession.status, 401);

    const anon = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${doomedId}`,
    });
    assert.equal(anon.status, 401);
    assert.equal(anon.body.error.code, "unauthenticated");

    const fullDriverLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    assert.equal(fullDriverLogin.status, 200);
    const asDriver = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${doomedId}`,
      token: fullDriverLogin.body.access_token,
    });
    assert.equal(asDriver.status, 403);
    assert.equal(asDriver.body.error.code, "forbidden");

    const otherCompany = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "other@fleet.example", password: "password1", client: "web" },
    });
    const cross = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${doomedId}`,
      token: otherCompany.body.access_token,
    });
    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.code, "not_found");

    const badId = await json(inject, {
      method: "DELETE",
      url: "/v1/drivers/00000000-0000-4000-8000-000000000099",
      token: ownerToken,
    });
    assert.equal(badId.status, 404);
    assert.equal(badId.body.error.code, "not_found");

    // Admin hard-deletes active driver
    const deleted = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${doomedId}`,
      token: adminToken,
    });
    assert.equal(deleted.status, 204);
    assert.equal(deleted.body, null);

    const goneGet = await json(inject, {
      method: "GET",
      url: `/v1/drivers/${doomedId}`,
      token: ownerToken,
    });
    assert.equal(goneGet.status, 404);
    assert.equal(goneGet.body.error.code, "not_found");

    const list = await json(inject, { method: "GET", url: "/v1/drivers", token: ownerToken });
    assert.equal(list.status, 200);
    assert.equal(
      (list.body.items as { id: string }[]).some((d) => d.id === doomedId),
      false,
    );

    const alreadyGone = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${doomedId}`,
      token: ownerToken,
    });
    assert.equal(alreadyGone.status, 404);
    assert.equal(alreadyGone.body.error.code, "not_found");

    const loginAfter = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver-delete@fleet.example", password: "anything1", client: "mobile" },
    });
    assert.equal(loginAfter.status, 401);
    assert.equal(loginAfter.body.error.code, "invalid_credentials");

    // Disable then delete still 204
    await json(inject, {
      method: "PATCH",
      url: `/v1/drivers/${disabledThenDelete.body.id}`,
      token: ownerToken,
      payload: { login_enabled: false },
    });
    const delDisabled = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${disabledThenDelete.body.id}`,
      token: ownerToken,
    });
    assert.equal(delDisabled.status, 204);

    // Email free for new create (new id)
    const recreated = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-delete@fleet.example" },
    });
    assert.equal(recreated.status, 201);
    assert.notEqual(recreated.body.id, doomedId);
    assert.equal(recreated.body.email, "driver-delete@fleet.example");

    // PATCH login_enabled still works on other drivers
    const patchKeep = await json(inject, {
      method: "PATCH",
      url: `/v1/drivers/${keep.body.id}`,
      token: ownerToken,
      payload: { login_enabled: false },
    });
    assert.equal(patchKeep.status, 200);
    assert.equal(patchKeep.body.login_enabled, false);
    await json(inject, {
      method: "PATCH",
      url: `/v1/drivers/${keep.body.id}`,
      token: ownerToken,
      payload: { login_enabled: true },
    });

    // Owner cannot delete non-driver principal via this path
    const ownerMe = await json(inject, { method: "GET", url: "/v1/me", token: ownerToken });
    const deleteOwner = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${ownerMe.body.id}`,
      token: ownerToken,
    });
    assert.equal(deleteOwner.status, 404);

    // Vehicles unchanged
    const vehiclesAfterList = await json(inject, {
      method: "GET",
      url: "/v1/vehicles",
      token: ownerToken,
    });
    assert.equal(vehiclesAfterList.status, 200);
    const vehicleIdsAfter = (vehiclesAfterList.body.items as { id: string }[]).map((v) => v.id);
    assert.deepEqual(vehicleIdsAfter.sort(), vehicleIdsBefore.sort());

    const homeAfter = await json(inject, { method: "GET", url: "/v1/home", token: ownerToken });
    assert.equal(homeAfter.status, 200);
    assert.equal(homeAfter.body.vehicle_count, vehiclesBefore);
    // deleted 2 (doomed + disabled), recreated 1 → net -1
    assert.equal(homeAfter.body.driver_count, driversBefore - 1);

    // Full session driver (post invite accept) also fails after delete
    const sessionDriver = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-session-kill@fleet.example" },
    });
    const inviteToken = mailer.lastToken();
    const accepted = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "driver-session-kill@fleet.example",
        password: "driver-sk-final",
        client: "mobile",
      },
    });
    assert.equal(accepted.status, 200);
    const fullSession = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: "driver-session-kill@fleet.example",
        password: "driver-sk-final",
        client: "mobile",
      },
    });
    assert.equal(fullSession.status, 200);

    const kill = await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${sessionDriver.body.id}`,
      token: ownerToken,
    });
    assert.equal(kill.status, 204);

    const meAfterKill = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: fullSession.body.access_token,
    });
    assert.equal(meAfterKill.status, 401);
    assert.equal(meAfterKill.body.error.code, "unauthenticated");

    const refreshAfterKill = await json(inject, {
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refresh_token: fullSession.body.refresh_token },
    });
    assert.equal(refreshAfterKill.status, 401);
    assert.equal(refreshAfterKill.body.error.code, "unauthenticated");
  });

  it("US-30 parallel sessions: web+mobile stay independent; logout is local", async () => {
    const web = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(web.status, 200);
    const mobile = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "mobile" },
    });
    assert.equal(mobile.status, 200);
    assert.notEqual(web.body.refresh_token, mobile.body.refresh_token);

    const meWeb = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: web.body.access_token,
    });
    const meMobile = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: mobile.body.access_token,
    });
    assert.equal(meWeb.status, 200);
    assert.equal(meMobile.status, 200);

    const logoutWeb = await json(inject, {
      method: "POST",
      url: "/v1/auth/logout",
      payload: { refresh_token: web.body.refresh_token },
      token: web.body.access_token,
    });
    assert.equal(logoutWeb.status, 204);

    const refreshWeb = await json(inject, {
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refresh_token: web.body.refresh_token },
    });
    assert.equal(refreshWeb.status, 401);

    const refreshMobile = await json(inject, {
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refresh_token: mobile.body.refresh_token },
    });
    assert.equal(refreshMobile.status, 200);
    assert.ok(refreshMobile.body.access_token);

    const meMobileAfter = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: refreshMobile.body.access_token,
    });
    assert.equal(meMobileAfter.status, 200);
  });

  it("US-29 refresh rotates tokens; expired family is 401 unauthenticated", async () => {
    const login = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(login.status, 200);
    const firstRefresh = login.body.refresh_token as string;

    const rotated = await json(inject, {
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refresh_token: firstRefresh },
    });
    assert.equal(rotated.status, 200);
    assert.ok(rotated.body.access_token);
    assert.ok(rotated.body.refresh_token);
    assert.notEqual(rotated.body.refresh_token, firstRefresh);

    const me = await json(inject, {
      method: "GET",
      url: "/v1/me",
      token: rotated.body.access_token,
    });
    assert.equal(me.status, 200);

    // Reuse of old refresh revokes family
    const reuse = await json(inject, {
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refresh_token: firstRefresh },
    });
    assert.equal(reuse.status, 401);
    assert.equal(reuse.body.error.code, "unauthenticated");

    // Fresh login then force absolute expiry on stored row
    const again = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(again.status, 200);
    const liveRefresh = again.body.refresh_token as string;
    const hash = sha256(liveRefresh);
    const row = await store.findRefreshByHash(hash);
    assert.ok(row);
    row.expiresAt = Date.now() - 1000;
    await store.insertRefresh(row);

    const expired = await json(inject, {
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refresh_token: liveRefresh },
    });
    assert.equal(expired.status, 401);
    assert.equal(expired.body.error.code, "unauthenticated");
  });

  it("US-33/US-34 driver next travel vehicles list, unit by country, put/get, owner forbidden", async () => {
    const ownerLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    assert.equal(ownerLogin.status, 200);
    const ownerTok = ownerLogin.body.access_token as string;

    const ro = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerTok,
      payload: {
        make: "Dacia",
        model: "Logan",
        license_plate: "B-RO-01",
        country_of_registration: "RO",
      },
    });
    assert.equal(ro.status, 201);
    const us = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerTok,
      payload: {
        make: "Ford",
        model: "F-150",
        license_plate: "TX-US-01",
        country_of_registration: "US",
      },
    });
    assert.equal(us.status, 201);
    const bare = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerTok,
      payload: { make: "Seat", model: "Leon", license_plate: "B-XX-99" },
    });
    assert.equal(bare.status, 201);

    mailer.sent = [];
    const invited = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerTok,
      payload: { email: "travel-driver@fleet.example" },
    });
    assert.equal(invited.status, 201);
    const inviteTok = mailer.lastToken();
    const accept = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteTok,
        email: "travel-driver@fleet.example",
        password: "driverpass1",
        client: "web",
      },
    });
    assert.equal(accept.status, 200);
    const driverTok = accept.body.access_token as string;

    const asOwnerList = await json(inject, {
      method: "GET",
      url: "/v1/driver/vehicles",
      token: ownerTok,
    });
    assert.equal(asOwnerList.status, 403);

    const list = await json(inject, {
      method: "GET",
      url: "/v1/driver/vehicles",
      token: driverTok,
    });
    assert.equal(list.status, 200);
    const byPlate = Object.fromEntries(list.body.items.map((v: { license_plate: string }) => [v.license_plate, v]));
    assert.equal(byPlate["B-RO-01"].odometer_unit, "km");
    assert.equal(byPlate["TX-US-01"].odometer_unit, "mi");
    assert.equal(byPlate["B-XX-99"].odometer_unit, "km");

    const empty = await json(inject, {
      method: "GET",
      url: "/v1/driver/travel",
      token: driverTok,
    });
    assert.equal(empty.status, 200);
    assert.equal(empty.body.travel, null);

    const badOdo = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverTok,
      payload: { vehicle_id: ro.body.id, odometer: -1 },
    });
    assert.equal(badOdo.status, 400);

    const badDec = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverTok,
      payload: { vehicle_id: ro.body.id, odometer: "12.34" },
    });
    assert.equal(badDec.status, 400);

    const putRo = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverTok,
      payload: { vehicle_id: ro.body.id, odometer: 100.5 },
    });
    assert.equal(putRo.status, 200);
    assert.equal(putRo.body.vehicle_id, ro.body.id);
    assert.equal(putRo.body.odometer, 100.5);
    assert.equal(putRo.body.odometer_unit, "km");

    const putUs = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverTok,
      payload: { vehicle_id: us.body.id, odometer: 50 },
    });
    assert.equal(putUs.status, 200);
    assert.equal(putUs.body.odometer_unit, "mi");
    assert.equal(putUs.body.vehicle_id, us.body.id);

    const got = await json(inject, {
      method: "GET",
      url: "/v1/driver/travel",
      token: driverTok,
    });
    assert.equal(got.status, 200);
    assert.equal(got.body.travel.vehicle_id, us.body.id);
    assert.equal(got.body.travel.odometer_unit, "mi");

    const ownerPut = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: ownerTok,
      payload: { vehicle_id: ro.body.id, odometer: 1 },
    });
    assert.equal(ownerPut.status, 403);
  });

  it("US-45–50 vehicle mileage optional unit authz and travel isolation", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const ownerTok = owner.body.access_token as string;

    const created = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerTok,
      payload: {
        make: "Dacia",
        model: "Logan",
        license_plate: "B-MI-01",
        country_of_registration: "RO",
        mileage: 12000.5,
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.mileage, 12000.5);
    assert.equal(created.body.mileage_unit, "km");

    const usCar = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerTok,
      payload: {
        make: "Ford",
        model: "F150",
        license_plate: "TX-MI-01",
        country_of_registration: "US",
        mileage: "88",
      },
    });
    assert.equal(usCar.status, 201);
    assert.equal(usCar.body.mileage, 88);
    assert.equal(usCar.body.mileage_unit, "mi");

    const bad = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerTok,
      payload: {
        make: "Bad",
        model: "Mile",
        license_plate: "BAD-MI",
        mileage: -1,
      },
    });
    assert.equal(bad.status, 400);

    const badDec = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${created.body.id}`,
      token: ownerTok,
      payload: { mileage: "12.34" },
    });
    assert.equal(badDec.status, 400);
    assert.equal(
      (
        await json(inject, {
          method: "GET",
          url: `/v1/vehicles/${created.body.id}`,
          token: ownerTok,
        })
      ).body.mileage,
      12000.5,
    );

    const cleared = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${created.body.id}`,
      token: ownerTok,
      payload: { mileage: null },
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.mileage, null);
    assert.equal(cleared.body.mileage_unit, "km");

    const unitFlip = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${usCar.body.id}`,
      token: ownerTok,
      payload: { country_of_registration: "RO", mileage: 88 },
    });
    assert.equal(unitFlip.status, 200);
    assert.equal(unitFlip.body.mileage, 88);
    assert.equal(unitFlip.body.mileage_unit, "km");

    const driver = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    const driverTok = driver.body.access_token as string;

    const driverCreate = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: driverTok,
      payload: { make: "Nope", model: "X", license_plate: "X", mileage: 1 },
    });
    assert.equal(driverCreate.status, 403);

    await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${usCar.body.id}`,
      token: ownerTok,
      payload: { mileage: 200 },
    });

    const travel = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverTok,
      payload: { vehicle_id: usCar.body.id, odometer: 999 },
    });
    assert.equal(travel.status, 200);
    assert.equal(travel.body.odometer, 999);

    const afterTravel = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${usCar.body.id}`,
      token: ownerTok,
    });
    assert.equal(afterTravel.body.mileage, 200);

    const driverList = await json(inject, {
      method: "GET",
      url: "/v1/driver/vehicles",
      token: driverTok,
    });
    assert.equal(driverList.status, 200);
    const listed = driverList.body.items.find((v: { id: string }) => v.id === usCar.body.id);
    assert.equal(listed.mileage, 200);
    assert.equal(listed.mileage_unit, "km");
  });

  it("US-35–39 vehicle side images upload replace clear and authz", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const token = owner.body.access_token as string;

    const created = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: { make: "Image", model: "Car", license_plate: "IMG-01" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.has_side_images, false);
    const vehicleId = created.body.id as string;

    const boundary = "----fleetbound";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="front.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      Buffer.from(TINY_PNG),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const uploaded = await inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    assert.equal(uploaded.statusCode, 200);
    const uploadedBody = JSON.parse(uploaded.body);
    assert.equal(uploadedBody.has_side_images, true);
    assert.ok(uploadedBody.side_images.FRONT.path.includes("/front.png"));
    assert.ok(String(uploadedBody.side_images.FRONT.url).startsWith("memory://"));
    assert.equal(uploadedBody.side_images.LEFT, null);
    const frontPath = uploadedBody.side_images.FRONT.path as string;
    assert.ok(vehicleImages.objects.has(frontPath), "upload must store object in bucket");

    const badType = await inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/sides/LEFT`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.txt"\r\nContent-Type: text/plain\r\n\r\nnot-an-image\r\n--${boundary}--\r\n`,
        ),
      ]),
    });
    assert.equal(badType.statusCode, 400);
    assert.equal(JSON.parse(badType.body).error.code, "validation_error");
    assert.match(JSON.parse(badType.body).error.message, /image/i);

    const gifBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="left.gif"\r\nContent-Type: image/gif\r\n\r\n`,
      ),
      Buffer.from(TINY_GIF),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const gifUploaded = await inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/sides/LEFT`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: gifBody,
    });
    assert.equal(gifUploaded.statusCode, 200);
    const gifJson = JSON.parse(gifUploaded.body);
    assert.ok(String(gifJson.side_images.LEFT.path).endsWith("/left.gif"));
    const leftPath = gifJson.side_images.LEFT.path as string;
    assert.ok(vehicleImages.objects.has(leftPath));

    const clearedLeft = await json(inject, {
      method: "DELETE",
      url: `/v1/vehicles/${vehicleId}/sides/LEFT`,
      token,
    });
    assert.equal(clearedLeft.status, 200);
    assert.equal(clearedLeft.body.side_images.LEFT, null);
    assert.equal(
      vehicleImages.objects.has(leftPath),
      false,
      "clear must delete the specific object from storage",
    );

    const cleared = await json(inject, {
      method: "DELETE",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      token,
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.has_side_images, false);
    assert.equal(cleared.body.side_images.FRONT, null);
    assert.equal(
      vehicleImages.objects.has(frontPath),
      false,
      "clear FRONT must remove FRONT object from storage",
    );

    const clearedAgain = await json(inject, {
      method: "DELETE",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      token,
    });
    assert.equal(clearedAgain.status, 200);

    const driver = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    const driverPut = await inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      headers: {
        authorization: `Bearer ${driver.body.access_token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    assert.equal(driverPut.statusCode, 403);

    // Re-upload as owner then driver clear must not delete storage
    const reUpload = await inject({
      method: "PUT",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    assert.equal(reUpload.statusCode, 200);
    const rePath = JSON.parse(reUpload.body).side_images.FRONT.path as string;
    assert.ok(vehicleImages.objects.has(rePath));
    const driverClear = await inject({
      method: "DELETE",
      url: `/v1/vehicles/${vehicleId}/sides/FRONT`,
      headers: { authorization: `Bearer ${driver.body.access_token}` },
    });
    assert.equal(driverClear.statusCode, 403);
    assert.ok(vehicleImages.objects.has(rePath), "forbidden clear must not delete storage object");
  });

  it("US-51–60 driver handovers out/in, mileage write-through, history authz", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const ownerToken = owner.body.access_token as string;

    const vehicle = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerToken,
      payload: {
        make: "Handover",
        model: "Van",
        license_plate: "HO-01",
        country_of_registration: "RO",
        mileage: 1000,
      },
    });
    assert.equal(vehicle.status, 201);
    const vehicleId = vehicle.body.id as string;

    const driverLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    const driverToken = driverLogin.body.access_token as string;

    const activeEmpty = await json(inject, {
      method: "GET",
      url: "/v1/driver/handovers/active",
      token: driverToken,
    });
    assert.equal(activeEmpty.status, 200);
    assert.equal(activeEmpty.body.handover, null);

    function handoverMultipart(fields: Record<string, string>, files: Uint8Array[] = []) {
      const boundary = "----handoverbound";
      const chunks: Buffer[] = [];
      for (const [name, value] of Object.entries(fields)) {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
          ),
        );
      }
      files.forEach((bytes, i) => {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="damages"; filename="d${i}.png"\r\nContent-Type: image/png\r\n\r\n`,
          ),
        );
        chunks.push(Buffer.from(bytes));
        chunks.push(Buffer.from("\r\n"));
      });
      chunks.push(Buffer.from(`--${boundary}--\r\n`));
      return {
        boundary,
        body: Buffer.concat(chunks),
      };
    }

    // Bind travel to this vehicle (driver may already have travel from earlier tests).
    const travel = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverToken,
      payload: { vehicle_id: vehicleId, odometer: 1000 },
    });
    assert.equal(travel.status, 200);
    assert.equal(travel.body.vehicle_id, vehicleId);

    // travel must not change vehicle.mileage
    const afterTravel = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      token: ownerToken,
    });
    assert.equal(afterTravel.body.mileage, 1000);

    const outLow = handoverMultipart({
      type: "out",
      mileage: "999",
      next_service_days: "30",
      next_service_distance: "500",
    });
    const outLowRes = await inject({
      method: "POST",
      url: "/v1/driver/handovers",
      headers: {
        authorization: `Bearer ${driverToken}`,
        "content-type": `multipart/form-data; boundary=${outLow.boundary}`,
      },
      payload: outLow.body,
    });
    assert.equal(outLowRes.statusCode, 400);

    const outOk = handoverMultipart(
      {
        type: "out",
        mileage: "1005.5",
        next_service_days: "14",
        next_service_distance: "250",
        damages_text: "Scratches",
      },
      [TINY_PNG],
    );
    const outRes = await inject({
      method: "POST",
      url: "/v1/driver/handovers",
      headers: {
        authorization: `Bearer ${driverToken}`,
        "content-type": `multipart/form-data; boundary=${outOk.boundary}`,
      },
      payload: outOk.body,
    });
    assert.equal(outRes.statusCode, 201);
    const outBody = JSON.parse(outRes.body);
    assert.equal(outBody.type, "out");
    assert.equal(outBody.status, "open");
    assert.equal(outBody.mileage, 1005.5);
    assert.equal(outBody.mileage_unit, "km");
    assert.equal(outBody.damage_image_count, 1);
    assert.equal(outBody.damages_text, "Scratches");
    const outId = outBody.id as string;
    assert.ok(outBody.damage_images[0].path.includes(`/handovers/${outId}/`));
    assert.ok(vehicleImages.objects.has(outBody.damage_images[0].path));

    const afterOut = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      token: ownerToken,
    });
    assert.equal(afterOut.body.mileage, 1005.5);

    const active = await json(inject, {
      method: "GET",
      url: "/v1/driver/handovers/active",
      token: driverToken,
    });
    assert.equal(active.status, 200);
    assert.equal(active.body.handover.id, outId);
    assert.equal(active.body.handover.vehicle_id, vehicleId);

    const secondOut = handoverMultipart({
      type: "out",
      mileage: "1010",
      next_service_days: "10",
      next_service_distance: "100",
    });
    const secondOutRes = await inject({
      method: "POST",
      url: "/v1/driver/handovers",
      headers: {
        authorization: `Bearer ${driverToken}`,
        "content-type": `multipart/form-data; boundary=${secondOut.boundary}`,
      },
      payload: secondOut.body,
    });
    assert.equal(secondOutRes.statusCode, 409);
    assert.equal(JSON.parse(secondOutRes.body).error.code, "handover_vehicle_open");

    const inLow = handoverMultipart({
      type: "in",
      mileage: "1000",
      next_service_days: "7",
      next_service_distance: "50",
    });
    const inLowRes = await inject({
      method: "POST",
      url: "/v1/driver/handovers",
      headers: {
        authorization: `Bearer ${driverToken}`,
        "content-type": `multipart/form-data; boundary=${inLow.boundary}`,
      },
      payload: inLow.body,
    });
    assert.equal(inLowRes.statusCode, 400);

    const inOk = handoverMultipart({
      type: "in",
      mileage: "1020",
      next_service_days: "21",
      next_service_distance: "400",
    });
    const inRes = await inject({
      method: "POST",
      url: "/v1/driver/handovers",
      headers: {
        authorization: `Bearer ${driverToken}`,
        "content-type": `multipart/form-data; boundary=${inOk.boundary}`,
      },
      payload: inOk.body,
    });
    assert.equal(inRes.statusCode, 201);
    const inBody = JSON.parse(inRes.body);
    assert.equal(inBody.type, "in");
    assert.equal(inBody.status, "closed");
    assert.equal(inBody.handover_out_id, outId);
    assert.equal(inBody.mileage, 1020);

    const afterIn = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      token: ownerToken,
    });
    assert.equal(afterIn.body.mileage, 1020);

    const activeAfter = await json(inject, {
      method: "GET",
      url: "/v1/driver/handovers/active",
      token: driverToken,
    });
    assert.equal(activeAfter.body.handover, null);

    const history = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}/handovers`,
      token: ownerToken,
    });
    assert.equal(history.status, 200);
    assert.ok(history.body.items.length >= 2);
    assert.equal(history.body.items[0].created_at >= history.body.items[1].created_at, true);

    const detail = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}/handovers/${outId}`,
      token: ownerToken,
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.id, outId);
    assert.equal(detail.body.damage_images.length, 1);
    assert.ok(String(detail.body.damage_images[0].url).startsWith("memory://"));

    const driverHistory = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}/handovers`,
      token: driverToken,
    });
    assert.equal(driverHistory.status, 403);

    const ownerCreate = handoverMultipart({
      type: "out",
      mileage: "1030",
      next_service_days: "5",
      next_service_distance: "10",
    });
    const ownerCreateRes = await inject({
      method: "POST",
      url: "/v1/driver/handovers",
      headers: {
        authorization: `Bearer ${ownerToken}`,
        "content-type": `multipart/form-data; boundary=${ownerCreate.boundary}`,
      },
      payload: ownerCreate.body,
    });
    assert.equal(ownerCreateRes.statusCode, 403);
  });

  it("US-61–67 driver daily usage create/list, gate, validation, no mileage write", async () => {
    const ownerReg = await json(inject, {
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "owner-daily@fleet.example",
        password: "password1",
        ...companyFields,
      },
    });
    assert.equal(ownerReg.status, 201);
    const ownerToken = ownerReg.body.access_token as string;

    const driverCreate = await json(inject, {
      method: "POST",
      url: "/v1/drivers",
      token: ownerToken,
      payload: { email: "driver-daily@fleet.example" },
    });
    assert.equal(driverCreate.status, 201);
    const driverId = driverCreate.body.id as string;
    const inviteToken = mailer.lastToken();
    const accept = await json(inject, {
      method: "POST",
      url: "/v1/auth/invite/accept",
      payload: {
        token: inviteToken,
        email: "driver-daily@fleet.example",
        password: "password1",
        client: "web",
      },
    });
    assert.equal(accept.status, 200);
    const driverToken = accept.body.access_token as string;

    const vehicle = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: ownerToken,
      payload: {
        make: "Daily",
        model: "Van",
        license_plate: "D-01-USE",
        country_of_registration: "RO",
        mileage: 1000,
      },
    });
    assert.equal(vehicle.status, 201);
    const vehicleId = vehicle.body.id as string;

    const emptyList = await json(inject, {
      method: "GET",
      url: "/v1/driver/daily-usage",
      token: driverToken,
    });
    assert.equal(emptyList.status, 200);
    assert.deepEqual(emptyList.body.items, []);

    const noTravel = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: driverToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "Depot",
        start_distance: 1000,
        start_time: "08:00",
        end_place: "Site",
        end_distance: 1010,
        end_time: "17:00",
      },
    });
    assert.equal(noTravel.status, 409);
    assert.equal(noTravel.body.error.code, "daily_usage_no_active_travel");

    const travel = await json(inject, {
      method: "PUT",
      url: "/v1/driver/travel",
      token: driverToken,
      payload: { vehicle_id: vehicleId, odometer: 1000 },
    });
    assert.equal(travel.status, 200);

    const lowStart = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: driverToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "Depot",
        start_distance: 999,
        start_time: "08:00",
        end_place: "Site",
        end_distance: 1010,
        end_time: "17:00",
      },
    });
    assert.equal(lowStart.status, 400);
    assert.equal(lowStart.body.error.code, "validation_error");

    const endBeforeStart = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: driverToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "Depot",
        start_distance: 1000,
        start_time: "17:00",
        end_place: "Site",
        end_distance: 1010,
        end_time: "08:00",
      },
    });
    assert.equal(endBeforeStart.status, 400);

    const endKmLow = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: driverToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "Depot",
        start_distance: 1010,
        start_time: "08:00",
        end_place: "Site",
        end_distance: 1005,
        end_time: "17:00",
      },
    });
    assert.equal(endKmLow.status, 400);

    const ok1 = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: driverToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "Depot A",
        start_distance: "1000.5",
        start_time: "08:30",
        end_place: "Site B",
        end_distance: 1100,
        end_time: "17:15",
      },
    });
    assert.equal(ok1.status, 201);
    assert.equal(ok1.body.vehicle_id, vehicleId);
    assert.equal(ok1.body.distance_unit, "km");
    assert.equal(ok1.body.start_place, "Depot A");
    assert.equal(ok1.body.vehicle.label, "Daily Van");

    const afterMileage = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      token: ownerToken,
    });
    assert.equal(afterMileage.status, 200);
    assert.equal(afterMileage.body.mileage, 1000);

    const ok2 = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: driverToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "Site B",
        start_distance: 1100,
        start_time: "18:00",
        end_place: "Depot A",
        end_distance: 1150,
        end_time: "19:00",
      },
    });
    assert.equal(ok2.status, 201);

    const list = await json(inject, {
      method: "GET",
      url: "/v1/driver/daily-usage",
      token: driverToken,
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 2);
    const ids = list.body.items.map((i: { id: string }) => i.id);
    assert.ok(ids.includes(ok1.body.id));
    assert.ok(ids.includes(ok2.body.id));

    const ownerList = await json(inject, {
      method: "GET",
      url: "/v1/driver/daily-usage",
      token: ownerToken,
    });
    assert.equal(ownerList.status, 403);

    const ownerPost = await json(inject, {
      method: "POST",
      url: "/v1/driver/daily-usage",
      token: ownerToken,
      payload: {
        usage_date: "2026-09-07",
        start_place: "X",
        start_distance: 1000,
        start_time: "08:00",
        end_place: "Y",
        end_distance: 1010,
        end_time: "09:00",
      },
    });
    assert.equal(ownerPost.status, 403);

    await json(inject, {
      method: "DELETE",
      url: `/v1/drivers/${driverId}`,
      token: ownerToken,
    });
    // Driver gone; owner still cannot list driver daily usage route as owner.
    const ownerAfterDelete = await json(inject, {
      method: "GET",
      url: "/v1/driver/daily-usage",
      token: ownerToken,
    });
    assert.equal(ownerAfterDelete.status, 403);
  });

  it("US-86–90 vehicle custom expirations CRUD warnings authz validation", async () => {
    const owner = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "owner@fleet.example", password: "password1", client: "web" },
    });
    const token = owner.body.access_token as string;
    const today = utcToday();

    // 1. Create without customs → empty array on read
    const bare = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: { make: "Custom", model: "Bare", license_plate: "CE-BARE" },
    });
    assert.equal(bare.status, 201);
    assert.deepEqual(bare.body.custom_expirations, []);

    // 2. Create with one row (no id) → mint UUID + echo
    const created = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: {
        make: "Custom",
        model: "One",
        license_plate: "CE-01",
        custom_expirations: [{ label: "  Fire ext  ", expires_on: addDays(today, 10) }],
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.custom_expirations.length, 1);
    const row0 = created.body.custom_expirations[0];
    assert.equal(row0.label, "Fire ext");
    assert.equal(row0.expires_on, addDays(today, 10));
    assert.match(row0.id, /^[0-9a-f-]{36}$/i);
    assert.equal(
      created.body.warnings.some(
        (w: { field: string; state: string }) =>
          w.field === `custom:${row0.id}` && w.state === "due_soon",
      ),
      true,
    );

    // 3. PATCH omit custom_expirations → unchanged
    const omitPatch = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${created.body.id}`,
      token,
      payload: { license_plate: "CE-01A" },
    });
    assert.equal(omitPatch.status, 200);
    assert.equal(omitPatch.body.license_plate, "CE-01A");
    assert.deepEqual(omitPatch.body.custom_expirations, created.body.custom_expirations);

    // 4. PATCH [] → clear
    const cleared = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${created.body.id}`,
      token,
      payload: { custom_expirations: [] },
    });
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.body.custom_expirations, []);
    assert.equal(
      cleared.body.warnings.some((w: { field: string }) => w.field.startsWith("custom:")),
      false,
    );

    // 5. Full replace keep id + add second (server mint)
    const keptId = row0.id as string;
    const replaced = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${created.body.id}`,
      token,
      payload: {
        custom_expirations: [
          { id: keptId, label: "Fire ext", expires_on: addDays(today, -2) },
          { label: "First aid", expires_on: addDays(today, 60) },
        ],
      },
    });
    assert.equal(replaced.status, 200);
    assert.equal(replaced.body.custom_expirations.length, 2);
    assert.equal(replaced.body.custom_expirations[0].id, keptId);
    assert.equal(replaced.body.custom_expirations[0].label, "Fire ext");
    assert.equal(replaced.body.custom_expirations[0].expires_on, addDays(today, -2));
    const second = replaced.body.custom_expirations[1];
    assert.notEqual(second.id, keptId);
    assert.equal(second.label, "First aid");
    const warnMap = Object.fromEntries(
      replaced.body.warnings.map((w: { field: string; state: string }) => [w.field, w.state]),
    );
    assert.equal(warnMap[`custom:${keptId}`], "expired");
    assert.equal(warnMap[`custom:${second.id}`], undefined);

    // 6. expiring filter includes custom-only warning vehicle
    const listExpiring = await json(inject, {
      method: "GET",
      url: "/v1/vehicles?expiring=true",
      token,
    });
    assert.equal(listExpiring.status, 200);
    assert.equal(
      listExpiring.body.items.some((v: { id: string }) => v.id === created.body.id),
      true,
    );

    // 7. registration still never warns even with customs outside window only on another car
    const regOnly = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token,
      payload: {
        make: "Custom",
        model: "Reg",
        license_plate: "CE-REG",
        registration_on: addDays(today, -10),
        custom_expirations: [{ label: "Far", expires_on: addDays(today, 90) }],
      },
    });
    assert.equal(regOnly.status, 201);
    assert.equal(regOnly.body.warnings.length, 0);
    assert.equal(
      regOnly.body.warnings.some((w: { field: string }) => w.field === "registration_on"),
      false,
    );

    // 8–14 validation matrix
    const vehicleId = created.body.id as string;
    async function badCustoms(payload: unknown) {
      return json(inject, {
        method: "PATCH",
        url: `/v1/vehicles/${vehicleId}`,
        token,
        payload: { custom_expirations: payload },
      });
    }

    // not array
    const notArray = await badCustoms({ label: "x", expires_on: addDays(today, 1) });
    assert.equal(notArray.status, 400);
    assert.equal(notArray.body.error.code, "validation_error");

    // >10
    const eleven = await badCustoms(
      Array.from({ length: 11 }, (_, i) => ({
        label: `Item ${i}`,
        expires_on: addDays(today, 40),
      })),
    );
    assert.equal(eleven.status, 400);
    assert.equal(eleven.body.error.code, "validation_error");

    // empty label / whitespace
    const emptyLabel = await badCustoms([{ label: "   ", expires_on: addDays(today, 40) }]);
    assert.equal(emptyLabel.status, 400);
    assert.equal(emptyLabel.body.error.code, "validation_error");

    // label > 80
    const longLabel = await badCustoms([
      { label: "x".repeat(81), expires_on: addDays(today, 40) },
    ]);
    assert.equal(longLabel.status, 400);
    assert.equal(longLabel.body.error.code, "validation_error");

    // duplicate labels CI
    const dupLabel = await badCustoms([
      { label: "Kit", expires_on: addDays(today, 40) },
      { label: " kit ", expires_on: addDays(today, 41) },
    ]);
    assert.equal(dupLabel.status, 400);
    assert.equal(dupLabel.body.error.code, "validation_error");

    // bad expires_on
    const badDate = await badCustoms([{ label: "Kit", expires_on: "07-09-2026" }]);
    assert.equal(badDate.status, 400);
    assert.equal(badDate.body.error.code, "validation_error");

    const missingDate = await badCustoms([{ label: "Kit" }]);
    assert.equal(missingDate.status, 400);
    assert.equal(missingDate.body.error.code, "validation_error");

    // bad id
    const badId = await badCustoms([
      { id: "not-a-uuid", label: "Kit", expires_on: addDays(today, 40) },
    ]);
    assert.equal(badId.status, 400);
    assert.equal(badId.body.error.code, "validation_error");

    // duplicate ids
    const sameId = "11111111-1111-4111-8111-111111111111";
    const dupId = await badCustoms([
      { id: sameId, label: "A", expires_on: addDays(today, 40) },
      { id: sameId, label: "B", expires_on: addDays(today, 41) },
    ]);
    assert.equal(dupId.status, 400);
    assert.equal(dupId.body.error.code, "validation_error");

    // prior good state still intact after validation failures
    const still = await json(inject, {
      method: "GET",
      url: `/v1/vehicles/${vehicleId}`,
      token,
    });
    assert.equal(still.status, 200);
    assert.equal(still.body.custom_expirations.length, 2);

    // 15. driver 403
    const driverLogin = await json(inject, {
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "driver@fleet.example", password: "new-driver", client: "mobile" },
    });
    assert.equal(driverLogin.status, 200);
    const driverPatch = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${vehicleId}`,
      token: driverLogin.body.access_token,
      payload: { custom_expirations: [{ label: "Nope", expires_on: addDays(today, 5) }] },
    });
    assert.equal(driverPatch.status, 403);
    assert.equal(driverPatch.body.error.code, "forbidden");

    // 16. Individual Owner allowed
    const solo = await json(inject, {
      method: "POST",
      url: "/v1/auth/register/individual",
      payload: { email: "solo-ce@fleet.example", password: "password1" },
    });
    assert.equal(solo.status, 201);
    const soloVeh = await json(inject, {
      method: "POST",
      url: "/v1/vehicles",
      token: solo.body.access_token,
      payload: {
        make: "Solo",
        model: "Car",
        license_plate: "CE-IND",
        custom_expirations: [{ label: "Vignette", expires_on: addDays(today, 5) }],
      },
    });
    assert.equal(soloVeh.status, 201);
    assert.equal(soloVeh.body.custom_expirations.length, 1);
    assert.equal(soloVeh.body.custom_expirations[0].label, "Vignette");
    assert.equal(
      soloVeh.body.warnings.some((w: { field: string }) => w.field.startsWith("custom:")),
      true,
    );

    // 10 items OK
    const tenOk = await json(inject, {
      method: "PATCH",
      url: `/v1/vehicles/${vehicleId}`,
      token,
      payload: {
        custom_expirations: Array.from({ length: 10 }, (_, i) => ({
          label: `Cap ${i}`,
          expires_on: addDays(today, 50 + i),
        })),
      },
    });
    assert.equal(tenOk.status, 200);
    assert.equal(tenOk.body.custom_expirations.length, 10);
  });

});
