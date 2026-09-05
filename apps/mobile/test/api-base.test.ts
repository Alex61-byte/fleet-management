import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hostFromExpoUri, pickLanApiBase } from "../lib/api-base";

describe("mobile API host resolution", () => {
  it("parses Expo hostUri and exp URLs", () => {
    assert.equal(hostFromExpoUri("192.168.1.20:8081"), "192.168.1.20");
    assert.equal(hostFromExpoUri("exp://192.168.1.20:8081"), "192.168.1.20");
    assert.equal(hostFromExpoUri("http://10.0.0.5:8081"), "10.0.0.5");
  });

  it("ignores empty localhost-style values", () => {
    assert.equal(hostFromExpoUri(""), null);
    assert.equal(hostFromExpoUri(undefined), null);
    assert.equal(hostFromExpoUri("localhost:8081"), "localhost");
  });

  it("picks LAN API base and skips loopback", () => {
    assert.equal(pickLanApiBase(["localhost:8081", "192.168.0.12:8081"]), "http://192.168.0.12:3001");
    assert.equal(pickLanApiBase(["127.0.0.1:8081"]), null);
  });
});
