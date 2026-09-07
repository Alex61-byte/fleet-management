import {
  jpegSideImageFilename,
  MAX_VEHICLE_IMAGE_BYTES,
  runSideImageCompressLadder,
  SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE,
  sideImagePreparePlan,
  fitLongEdge,
} from "@fleet/sdk";

export type PreparedSideImage =
  | { ok: true; file: Blob; filename: string }
  | { ok: false; message: string };

function loadImageBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * If over 5 MiB, downsize + JPEG ladder so PUT can succeed. Under limit: passthrough.
 */
export async function prepareVehicleSideImageForUpload(
  file: File,
  sideHint?: string,
): Promise<PreparedSideImage> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    return { ok: false, message: "Upload an image file." };
  }

  const plan = sideImagePreparePlan(file.size);
  if (plan.action === "passthrough") {
    return { ok: true, file, filename: file.name || jpegSideImageFilename(undefined, sideHint) };
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImageBitmap(file);
  } catch {
    return { ok: false, message: "Could not prepare photo. Try another image." };
  }

  const srcW = "naturalWidth" in source ? source.naturalWidth || source.width : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight || source.height : source.height;
  if (!srcW || !srcH) {
    if ("close" in source && typeof source.close === "function") source.close();
    return { ok: false, message: "Could not prepare photo. Try another image." };
  }

  const filename = jpegSideImageFilename(file.name, sideHint);
  try {
    const result = await runSideImageCompressLadder(async (longEdge, quality) => {
      const { width, height } = fitLongEdge(srcW, srcH, longEdge);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, width, height);
      const blob = await canvasToJpegBlob(canvas, quality);
      if (!blob || blob.size === 0) return null;
      return { byteLength: blob.size, payload: blob };
    });

    if (!result.ok) {
      return { ok: false, message: SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE };
    }
    if (result.payload.size > MAX_VEHICLE_IMAGE_BYTES) {
      return { ok: false, message: SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE };
    }
    return { ok: true, file: result.payload, filename };
  } catch {
    return { ok: false, message: "Could not prepare photo. Try another image." };
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}
