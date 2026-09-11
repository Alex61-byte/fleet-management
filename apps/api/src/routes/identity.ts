import type { Client } from "../domain.ts";
import {
  companyNameBody,
  emailPassword,
  loginBody,
  registerBody,
  registerIndividualBody,
} from "./schemas.ts";
import type { RouteContext } from "./context.ts";

export function registerIdentityRoutes(ctx: RouteContext): void {
  const { app, identity, requireSession, bumpTenant, sendList } = ctx;
  app.post(
    "/v1/auth/register",
    { schema: { body: registerBody } },
    async (req, reply) => {
      const body = req.body as {
        email: string;
        password: string;
        name: string;
        registration_number: string;
        vat_number: string;
        address: string;
      };
      const result = await identity.register(body);
      return reply.status(201).send(result);
    },
  );

  app.post(
    "/v1/auth/register/individual",
    { schema: { body: registerIndividualBody } },
    async (req, reply) => {
      const body = req.body as { email: string; password: string };
      const result = await identity.registerIndividual(body);
      return reply.status(201).send(result);
    },
  );

  app.post("/v1/auth/login", { schema: { body: loginBody } }, async (req) => {
    const body = req.body as { email: string; password: string; client: Client };
    return identity.login(body.email, body.password, body.client);
  });

  app.post(
    "/v1/auth/totp/verify",
    {
      schema: {
        body: {
          type: "object",
          required: ["challenge_token", "code"],
          additionalProperties: false,
          properties: {
            challenge_token: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    async (req) => {
      const body = req.body as { challenge_token: string; code: string };
      return identity.verifyTotpChallenge(body.challenge_token, body.code);
    },
  );

  app.post(
    "/v1/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refresh_token"],
          additionalProperties: false,
          properties: { refresh_token: { type: "string" } },
        },
      },
    },
    async (req) => {
      const body = req.body as { refresh_token: string };
      return identity.refresh(body.refresh_token);
    },
  );

  app.post(
    "/v1/auth/password/forgot",
    {
      schema: {
        body: {
          type: "object",
          required: ["email"],
          additionalProperties: false,
          properties: { email: { type: "string", format: "email" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { email: string };
      await identity.forgotPassword(body.email);
      return reply.status(202).send({});
    },
  );

  app.post(
    "/v1/auth/password/reset",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "password"],
          additionalProperties: false,
          properties: {
            token: { type: "string" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { token: string; password: string };
      await identity.resetPassword(body.token, body.password);
      return reply.status(204).send();
    },
  );


  app.post(
    "/v1/auth/invite/preview",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          additionalProperties: false,
          properties: { token: { type: "string", minLength: 1 } },
        },
      },
    },
    async (req) => {
      const body = req.body as { token: string };
      return identity.previewInvite(body.token);
    },
  );

  app.post(
    "/v1/auth/invite/accept",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "email", "password", "client"],
          additionalProperties: false,
          properties: {
            token: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
            client: { type: "string", enum: ["web", "mobile"] },
          },
        },
      },
    },
    async (req) => {
      const body = req.body as {
        token: string;
        email: string;
        password: string;
        client: Client;
      };
      return identity.acceptInvite(body);
    },
  );

  app.get("/v1/me", { preHandler: requireSession }, async (req) => {
    return identity.me(req.claims!);
  });

  app.patch(
    "/v1/company/name",
    { preHandler: requireSession, schema: { body: companyNameBody } },
    async (req) => {
      const body = req.body as { name: string };
      return identity.setCompanyName(req.claims!, body.name);
    },
  );

  app.post(
    "/v1/auth/logout",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["refresh_token"],
          additionalProperties: false,
          properties: { refresh_token: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { refresh_token: string };
      await identity.logout(body.refresh_token);
      return reply.status(204).send();
    },
  );


  app.get("/v1/auth/totp", { preHandler: requireSession }, async (req) => {
    return identity.totpStatus(req.claims!);
  });

  app.post("/v1/auth/totp/setup", { preHandler: requireSession }, async (req) => {
    return identity.totpSetup(req.claims!);
  });

  app.post(
    "/v1/auth/totp/confirm",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["code"],
          additionalProperties: false,
          properties: { code: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { code: string };
      await identity.totpConfirm(req.claims!, body.code);
      return reply.status(204).send();
    },
  );

  app.post(
    "/v1/auth/totp/disable",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["code"],
          additionalProperties: false,
          properties: { code: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { code: string };
      await identity.totpDisable(req.claims!, body.code);
      return reply.status(204).send();
    },
  );

  app.get("/v1/admins", { preHandler: requireSession }, async (req, reply) => {
    const body = await identity.listAdmins(req.claims!);
    const q = req.query as { limit?: string; cursor?: string };
    return sendList(req, reply, req.claims!.company_id, "admins", body.items, q);
  });

  app.post(
    "/v1/admins",
    { preHandler: requireSession, schema: { body: emailPassword } },
    async (req, reply) => {
      const body = req.body as { email: string; password: string };
      const created = await identity.createAdmin(req.claims!, body.email, body.password);
      bumpTenant(req.claims!.company_id);
      return reply.status(201).send(created);
    },
  );

  app.get("/v1/drivers", { preHandler: requireSession }, async (req, reply) => {
    const body = await identity.listDrivers(req.claims!);
    const q = req.query as { limit?: string; cursor?: string };
    return sendList(req, reply, req.claims!.company_id, "drivers", body.items, q);
  });

  app.post(
    "/v1/drivers",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["email"],
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { email: string };
      const created = await identity.createDriver(req.claims!, body.email);
      bumpTenant(req.claims!.company_id);
      return reply.status(201).send(created);
    },
  );

  app.post(
    "/v1/drivers/:id/invite/resend",
    { preHandler: requireSession },
    async (req) => {
      const { id } = req.params as { id: string };
      const res = await identity.resendDriverInvite(req.claims!, id);
      bumpTenant(req.claims!.company_id);
      return res;
    },
  );

  app.get("/v1/drivers/:id", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return identity.getDriver(req.claims!, id);
  });

  app.patch(
    "/v1/drivers/:id",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            login_enabled: { type: "boolean" },
          },
        },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const body = req.body as { email?: string; login_enabled?: boolean };
      const patched = await identity.patchDriver(req.claims!, id, body);
      bumpTenant(req.claims!.company_id);
      return patched;
    },
  );

  app.delete("/v1/drivers/:id", { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await identity.deleteDriver(req.claims!, id);
    bumpTenant(req.claims!.company_id);
    return reply.status(204).send();
  });

}
