import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TenantRevisionRegistry,
  ifNoneMatch,
  parsePageParams,
  slicePage,
  encodeCursor,
} from "../src/tenant-revision.ts";
import { errors } from "../src/errors.ts";

describe("tenant-revision", () => {
  it("bumps etag and matches If-None-Match", () => {
    const reg = new TenantRevisionRegistry();
    const a = reg.etag("c1", "vehicles");
    assert.equal(ifNoneMatch(a, a), true);
    assert.equal(ifNoneMatch(`W/${a}`, a), true);
    assert.equal(ifNoneMatch('"other"', a), false);
    reg.bump("c1");
    const b = reg.etag("c1", "vehicles");
    assert.notEqual(a, b);
    assert.notEqual(reg.etag("c1", "vehicles"), reg.etag("c2", "vehicles"));
    assert.notEqual(reg.etag("c1", "vehicles"), reg.etag("c1", "drivers"));
  });

  it("parses pagination and slices", () => {
    const full = parsePageParams({}, (m) => {
      throw new Error(m);
    });
    assert.equal(full.paging, false);
    const page = parsePageParams({ limit: "2", cursor: encodeCursor(2) }, (m) => {
      throw errors.validation(m);
    });
    assert.equal(page.paging, true);
    assert.equal(page.limit, 2);
    assert.equal(page.offset, 2);
    const sliced = slicePage([1, 2, 3, 4, 5], page);
    assert.deepEqual(sliced.items, [3, 4]);
    assert.ok(sliced.next_cursor);
  });
});
