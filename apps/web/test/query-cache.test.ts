import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cacheKey,
  clearQueryCache,
  getCached,
  isFresh,
  setCached,
  invalidateCompany,
} from "../lib/query-cache.ts";

describe("query-cache", () => {
  it("keys by company and invalidates tenant prefix", () => {
    clearQueryCache();
    const key = cacheKey("co-1", "vehicles");
    setCached(key, { items: [1] }, '"etag-1"');
    assert.deepEqual(getCached(key)?.data, { items: [1] });
    assert.equal(isFresh(getCached(key), 60_000), true);
    invalidateCompany("co-1");
    assert.equal(getCached(key), undefined);
  });
});
