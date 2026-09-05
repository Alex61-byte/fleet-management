import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { driverInviteHtml, driverInviteText, escapeHtml } from "../src/mailer.ts";

describe("driver invite email template", () => {
  const mail = {
    to: "driver@example.com",
    inviteUrl: "http://localhost:3000/invite?token=abc&x=1",
  };

  it("escapeHtml encodes markup", () => {
    assert.equal(escapeHtml('a<b>"c\'&'), "a&lt;b&gt;&quot;c&#39;&amp;");
  });

  it("html is table-based with CTA and escaped url", () => {
    const html = driverInviteHtml(mail);
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /Accept invitation/);
    assert.match(html, /Driver invitation/);
    assert.match(html, /background-color:#163a64/);
    assert.match(html, /expires in/);
    assert.match(html, /http:\/\/localhost:3000\/invite\?token=abc&amp;x=1/);
    assert.doesNotMatch(html, /token=abc&x=1/);
  });

  it("text includes link and expiry", () => {
    const text = driverInviteText(mail);
    assert.match(text, /driver invitation/i);
    assert.match(text, /http:\/\/localhost:3000\/invite\?token=abc&x=1/);
    assert.match(text, /7 days/);
  });
});
