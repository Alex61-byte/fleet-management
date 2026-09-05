import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { authenticator } from "otplib";
import { buildApp } from "../src/app.ts";
import { IdentityService } from "../src/identity-service.ts";
import { MemoryStore } from "../src/store.ts";
import { addDays, utcToday } from "../src/domain.ts";
import { sha256 } from "../src/crypto.ts";
import type { InviteMail, Mailer } from "../src/mailer.ts";

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

describe("HTTP /v1 first slice", () => {
  const store = new MemoryStore();
  const mailer = new RecordingMailer();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let inject: Inject;

  before(async () => {
    app = await buildApp({ store, jwtSecret: secret, mailer });
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
    assert.equal(ok.body.must_change_password, false);
    assert.ok(ok.body.access_token);

    const dup = await json(inject, {
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "owner@fleet.example", password: "password1", ...companyFields },
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, "email_in_use");
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

});
