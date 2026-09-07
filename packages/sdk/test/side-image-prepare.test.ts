import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fitLongEdge,
  jpegSideImageFilename,
  MAX_VEHICLE_IMAGE_BYTES,
  runSideImageCompressLadder,
  sideImagePreparePlan,
  SIDE_IMAGE_JPEG_QUALITIES,
  SIDE_IMAGE_LONG_EDGES,
} from "../src/index.ts";

describe("side image prepare policy (client downsize)", () => {
  it("mirrors API 5 MiB limit", () => {
    assert.equal(MAX_VEHICLE_IMAGE_BYTES, 5 * 1024 * 1024);
  });

  it("passthrough when at or under limit", () => {
    assert.deepEqual(sideImagePreparePlan(0), { action: "passthrough" });
    assert.deepEqual(sideImagePreparePlan(MAX_VEHICLE_IMAGE_BYTES), { action: "passthrough" });
    assert.deepEqual(sideImagePreparePlan(1024), { action: "passthrough" });
  });

  it("compress plan when over limit", () => {
    const plan = sideImagePreparePlan(MAX_VEHICLE_IMAGE_BYTES + 1);
    assert.equal(plan.action, "compress");
    if (plan.action === "compress") {
      assert.deepEqual([...plan.longEdges], [...SIDE_IMAGE_LONG_EDGES]);
      assert.deepEqual([...plan.qualities], [...SIDE_IMAGE_JPEG_QUALITIES]);
    }
  });

  it("fitLongEdge preserves aspect and caps long side", () => {
    assert.deepEqual(fitLongEdge(4000, 3000, 2048), { width: 2048, height: 1536 });
    assert.deepEqual(fitLongEdge(800, 600, 2048), { width: 800, height: 600 });
    assert.deepEqual(fitLongEdge(1000, 4000, 1280), { width: 320, height: 1280 });
  });

  it("compress ladder stops at first under-limit candidate", async () => {
    const calls: Array<{ longEdge: number; quality: number }> = [];
    const result = await runSideImageCompressLadder(async (longEdge, quality) => {
      calls.push({ longEdge, quality });
      if (longEdge === 2048 && quality === 0.75) {
        return { byteLength: MAX_VEHICLE_IMAGE_BYTES - 10, payload: "ok" };
      }
      return { byteLength: MAX_VEHICLE_IMAGE_BYTES + 1, payload: "big" };
    });
    assert.deepEqual(result, { ok: true, payload: "ok" });
    assert.deepEqual(calls[0], { longEdge: 2048, quality: 0.85 });
    assert.deepEqual(calls[1], { longEdge: 2048, quality: 0.75 });
    assert.equal(calls.length, 2);
  });

  it("compress ladder reports still_too_large when exhausted", async () => {
    const result = await runSideImageCompressLadder(async () => ({
      byteLength: MAX_VEHICLE_IMAGE_BYTES + 100,
      payload: null,
    }));
    assert.deepEqual(result, { ok: false, reason: "still_too_large" });
  });

  it("jpegSideImageFilename normalizes extension", () => {
    assert.equal(jpegSideImageFilename("Front Photo.PNG"), "Front_Photo.jpg");
    assert.equal(jpegSideImageFilename(undefined, "LEFT"), "left.jpg");
    assert.equal(jpegSideImageFilename(null), "photo.jpg");
  });
});
