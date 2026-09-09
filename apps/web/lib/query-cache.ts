"use client";

/**
 * In-memory SWR-style cache keyed by company + resource (ADR-020).
 * Stores last body + ETag; conditional GETs skip body when 304.
 */

export type CacheEntry<T> = {
  data: T;
  etag: string | null;
  updatedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** Default freshness window before background revalidate. */
export const DEFAULT_STALE_MS = 60_000;

export function cacheKey(companyId: string, resource: string, extra = ""): string {
  return `${companyId}::${resource}${extra ? `::${extra}` : ""}`;
}

export function getCached<T>(key: string): CacheEntry<T> | undefined {
  return store.get(key) as CacheEntry<T> | undefined;
}

export function setCached<T>(key: string, data: T, etag: string | null): CacheEntry<T> {
  const entry: CacheEntry<T> = { data, etag, updatedAt: Date.now() };
  store.set(key, entry as CacheEntry<unknown>);
  return entry;
}

export function invalidatePrefix(prefix: string): void {
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/** Invalidate all keys for a tenant (after mutation or sign-out). */
export function invalidateCompany(companyId: string): void {
  invalidatePrefix(`${companyId}::`);
}

export function clearQueryCache(): void {
  store.clear();
}

export function isFresh(entry: CacheEntry<unknown> | undefined, staleMs = DEFAULT_STALE_MS): boolean {
  if (!entry) return false;
  return Date.now() - entry.updatedAt < staleMs;
}

type ConditionalListResult<T> = {
  data: T | undefined;
  etag: string | null;
  notModified: boolean;
};

/**
 * Read-through cache for conditional list/home GETs.
 * - Fresh cache → return immediately (no network).
 * - Stale/missing → GET with If-None-Match; 304 keeps prior data.
 */
export async function cachedConditionalGet<T>(options: {
  key: string;
  etagFromCache?: boolean;
  staleMs?: number;
  force?: boolean;
  fetch: (etag: string | null) => Promise<ConditionalListResult<T>>;
}): Promise<{ data: T; fromCache: boolean; notModified: boolean }> {
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const existing = getCached<T>(options.key);

  if (!options.force && isFresh(existing, staleMs) && existing) {
    return { data: existing.data, fromCache: true, notModified: false };
  }

  const etag = options.etagFromCache === false ? null : (existing?.etag ?? null);
  const res = await options.fetch(etag);

  if (res.notModified) {
    if (existing) {
      // Refresh freshness timestamp; keep body.
      setCached(options.key, existing.data, res.etag ?? existing.etag);
      return { data: existing.data, fromCache: true, notModified: true };
    }
    // 304 without local body — force full fetch once.
    const full = await options.fetch(null);
    if (!full.data) throw new Error("conditional GET returned no data");
    setCached(options.key, full.data, full.etag);
    return { data: full.data, fromCache: false, notModified: false };
  }

  if (!res.data) throw new Error("conditional GET returned no data");
  setCached(options.key, res.data, res.etag);
  return { data: res.data, fromCache: false, notModified: false };
}
