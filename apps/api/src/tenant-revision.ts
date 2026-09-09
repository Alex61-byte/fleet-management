/**
 * Per-tenant monotonic data revision for list ETags (ADR-020).
 * Day-1: in-process only. Redis/DB-backed store can replace this without
 * changing the HTTP contract (ETag stays opaque).
 */

export type ListKey =
  | "admins"
  | "drivers"
  | "vehicles"
  | "vehicles:expiring"
  | "home"
  | "driver-vehicles";

export class TenantRevisionRegistry {
  private readonly rev = new Map<string, number>();

  /** Current revision for company (starts at 1). */
  current(companyId: string): number {
    const n = this.rev.get(companyId);
    if (n == null) {
      this.rev.set(companyId, 1);
      return 1;
    }
    return n;
  }

  /** Advance revision after list-visible writes. */
  bump(companyId: string): number {
    const next = this.current(companyId) + 1;
    this.rev.set(companyId, next);
    return next;
  }

  /**
   * Strong ETag for a list identity. Includes company, list key, and revision.
   * Not reusable across tenants or filters.
   */
  etag(companyId: string, listKey: ListKey): string {
    const r = this.current(companyId);
    // Quoted strong validator per RFC 9110.
    return `"t:${companyId}:${listKey}:v${r}"`;
  }
}

/** True if If-None-Match includes the current etag (or *). */
export function ifNoneMatch(header: string | string[] | undefined, etag: string): boolean {
  if (header == null) return false;
  const raw = Array.isArray(header) ? header.join(",") : header;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.includes("*")) return true;
  const want = etag.trim();
  for (const p of parts) {
    // Clients may send W/ prefix; compare opaque tag body.
    const normalized = p.replace(/^W\//i, "").trim();
    if (normalized === want) return true;
  }
  return false;
}

export type PageParams = {
  /** When set, response uses paginated shape. */
  paging: boolean;
  limit: number;
  /** 0-based start index. */
  offset: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Parse optional limit/cursor. Absence of both → full list (legacy body).
 * Invalid values throw via `onError`.
 */
export function parsePageParams(
  query: { limit?: string; cursor?: string },
  onError: (message: string) => never,
): PageParams {
  const hasLimit = query.limit !== undefined && query.limit !== "";
  const hasCursor = query.cursor !== undefined && query.cursor !== "";
  if (!hasLimit && !hasCursor) {
    return { paging: false, limit: DEFAULT_LIMIT, offset: 0 };
  }

  let limit = DEFAULT_LIMIT;
  if (hasLimit) {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      onError(`limit must be an integer from 1 to ${MAX_LIMIT}.`);
    }
    limit = n;
  }

  let offset = 0;
  if (hasCursor) {
    const decoded = decodeCursor(query.cursor!);
    if (decoded == null) onError("cursor is not valid.");
    offset = decoded;
  }

  return { paging: true, limit, offset };
}

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): number | null {
  try {
    const s = Buffer.from(cursor, "base64url").toString("utf8");
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  } catch {
    return null;
  }
}

export function slicePage<T>(
  items: T[],
  page: PageParams,
): { items: T[]; next_cursor: string | null } {
  const slice = items.slice(page.offset, page.offset + page.limit);
  const nextOffset = page.offset + slice.length;
  const next_cursor = nextOffset < items.length ? encodeCursor(nextOffset) : null;
  return { items: slice, next_cursor };
}
