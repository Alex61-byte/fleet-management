import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError, errors } from "./errors.ts";
import { normalizeEmail } from "./domain.ts";

/** Trim+lower body.email before AJV `format: "email"` so padded input is not validation_error. */
export function normalizeBodyEmail(
  req: FastifyRequest,
  _reply: FastifyReply,
  done: (err?: Error) => void,
) {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (typeof record.email === "string") {
      record.email = normalizeEmail(record.email);
    }
  }
  done();
}

export function sendError(reply: FastifyReply, err: AppError) {
  return reply.status(err.status).send({
    error: { code: err.code, message: err.message },
  });
}

export function bearer(req: FastifyRequest): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw errors.unauthenticated();
  return header.slice("Bearer ".length);
}
