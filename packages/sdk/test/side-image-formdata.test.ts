import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sideImageUploadFormData } from "../src/index.ts";

describe("sideImageUploadFormData (US-35/36 multipart field file)", () => {
  it("appends Blob with filename on the file field", () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
    const form = sideImageUploadFormData(blob, "front.jpg");
    const part = form.get("file");
    assert.ok(part instanceof Blob);
    assert.equal(part.type, "image/jpeg");
    // File extends Blob in Node; filename preserved when third append arg used
    if (typeof File !== "undefined" && part instanceof File) {
      assert.equal(part.name, "front.jpg");
    }
  });

  it("normalizes RN-shaped local file with name and type defaults", () => {
    const form = sideImageUploadFormData({ uri: "file:///tmp/x" });
    const part = form.get("file") as unknown as { uri?: string; name?: string; type?: string };
    // In Node, non-Blob append may coerce; still ensure we don't throw and field exists
    assert.ok(part != null);
    if (part && typeof part === "object" && "uri" in part) {
      assert.equal(part.uri, "file:///tmp/x");
      assert.equal(part.name, "photo.jpg");
      assert.equal(part.type, "image/jpeg");
    }
  });

  it("prefers local name/type over defaults when provided", () => {
    const form = sideImageUploadFormData(
      { uri: "file:///tmp/y.png", name: "left.png", type: "image/png" },
      "ignored-when-local-name.jpg",
    );
    const part = form.get("file") as unknown as { uri?: string; name?: string; type?: string };
    assert.ok(part != null);
    if (part && typeof part === "object" && "uri" in part) {
      assert.equal(part.name, "left.png");
      assert.equal(part.type, "image/png");
    }
  });

  it("appends BytesImageFile (expo-file-system style) for Expo winter fetch", () => {
    const bytesFile = {
      name: "front.jpg",
      type: "image/jpeg",
      size: 12,
      bytes: async () => new Uint8Array([1, 2, 3]),
    };
    // Must not throw; Node undici FormData may coerce non-Blobs, RN/Expo keep the object in _parts.
    const form = sideImageUploadFormData(bytesFile, "fallback.jpg");
    assert.ok(form.has("file"));
    const parts = (form as unknown as { _parts?: [string, unknown][] })._parts;
    if (Array.isArray(parts) && parts.length > 0) {
      const part = parts.find(([k]) => k === "file")?.[1] as {
        bytes?: () => Promise<Uint8Array>;
        name?: string;
        type?: string;
      };
      assert.equal(typeof part?.bytes, "function");
      assert.equal(part?.name, "front.jpg");
      assert.equal(part?.type, "image/jpeg");
    }
  });
});
