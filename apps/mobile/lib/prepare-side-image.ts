import {
  fitLongEdge,
  jpegSideImageFilename,
  type BytesImageFile,
  MAX_VEHICLE_IMAGE_BYTES,
  runSideImageCompressLadder,
  SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE,
  sideImagePreparePlan,
} from "@fleet/sdk";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { sideImageLog } from "./side-image-log";

export type PreparedSideImage =
  | { ok: true; file: BytesImageFile; filename: string }
  | { ok: false; message: string };

export type PickerSideAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
};

/**
 * Expo winter fetch only accepts FormData parts that are string | Blob | { bytes() }.
 * `{ uri }` throws "Unsupported FormDataPart implementation".
 * expo-file-system File implements bytes() and size/type.
 */
function fileFromUri(uri: string, name: string, type: string): BytesImageFile {
  const native = new File(uri);
  // Ensure content-disposition filename for convertFormDataAsync headers.
  try {
    Object.defineProperty(native, "name", {
      value: name,
      configurable: true,
      writable: true,
    });
  } catch {
    /* native name getter may already exist */
  }
  if (!native.type) {
    try {
      Object.defineProperty(native, "type", {
        value: type,
        configurable: true,
        writable: true,
      });
    } catch {
      /* ignore */
    }
  }
  return native as unknown as BytesImageFile;
}

function measureLocalFile(uri: string): number {
  try {
    const f = new File(uri);
    return typeof f.size === "number" && f.size > 0 ? f.size : 0;
  } catch {
    return 0;
  }
}

/**
 * If over 5 MiB, resize + JPEG compress via expo-image-manipulator. Under limit: passthrough.
 * Always returns expo-file-system File-like parts (bytes()), never Blob/{uri}.
 */
export async function prepareVehicleSideImageForUpload(
  asset: PickerSideAsset,
  sideHint?: string,
): Promise<PreparedSideImage> {
  const mime = asset.mimeType?.startsWith("image/") ? asset.mimeType : "image/jpeg";
  const originalName =
    asset.fileName?.trim() ||
    `${(sideHint ?? "photo").toLowerCase()}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;

  sideImageLog.info("prepare:start", {
    sideHint: sideHint ?? null,
    uriScheme: asset.uri?.split(":")[0] ?? null,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    fileSize: asset.fileSize ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    maxBytes: MAX_VEHICLE_IMAGE_BYTES,
  });

  let byteLength =
    typeof asset.fileSize === "number" && asset.fileSize > 0 ? asset.fileSize : 0;
  const measured = measureLocalFile(asset.uri);
  if (measured > 0) {
    byteLength = measured;
    sideImageLog.info("prepare:measure-ok", { byteLength, via: "expo-file-system" });
  } else if (byteLength > 0) {
    sideImageLog.info("prepare:measure-fallback-picker-size", { byteLength });
  } else {
    sideImageLog.warn("prepare:measure-unknown", { uriScheme: asset.uri?.split(":")[0] ?? null });
    // Cannot measure size — compress path to be safe under limit.
    byteLength = MAX_VEHICLE_IMAGE_BYTES + 1;
  }

  const plan = sideImagePreparePlan(byteLength);
  sideImageLog.info("prepare:plan", { byteLength, action: plan.action });

  if (plan.action === "passthrough") {
    const file = fileFromUri(asset.uri, originalName, mime);
    sideImageLog.info("prepare:passthrough-fs-file", {
      filename: originalName,
      type: mime,
      byteLength,
      uriScheme: asset.uri?.split(":")[0] ?? null,
      hasBytes: typeof file.bytes === "function",
    });
    return { ok: true, file, filename: originalName };
  }

  const srcW = asset.width && asset.width > 0 ? asset.width : 4096;
  const srcH = asset.height && asset.height > 0 ? asset.height : 4096;
  const filename = jpegSideImageFilename(asset.fileName, sideHint);
  sideImageLog.info("prepare:compress-start", {
    srcW,
    srcH,
    filename,
    assumedDims: !(asset.width && asset.width > 0 && asset.height && asset.height > 0),
  });

  try {
    const result = await runSideImageCompressLadder(async (longEdge, quality) => {
      const { width, height } = fitLongEdge(srcW, srcH, longEdge);
      sideImageLog.info("prepare:compress-try", { longEdge, quality, width, height });
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width, height } }],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );
        const outSize = measureLocalFile(manipulated.uri);
        sideImageLog.info("prepare:compress-candidate", {
          longEdge,
          quality,
          byteLength: outSize,
          underLimit: outSize > 0 && outSize <= MAX_VEHICLE_IMAGE_BYTES,
          outUriScheme: manipulated.uri?.split(":")[0] ?? null,
        });
        if (outSize <= 0) return null;
        return {
          byteLength: outSize,
          payload: fileFromUri(manipulated.uri, filename, "image/jpeg"),
        };
      } catch (err) {
        sideImageLog.warn("prepare:compress-try-failed", {
          longEdge,
          quality,
          message: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    });

    if (!result.ok) {
      sideImageLog.error("prepare:still-too-large", { filename });
      return { ok: false, message: SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE };
    }
    sideImageLog.info("prepare:compress-ok", {
      filename,
      hasBytes: typeof result.payload.bytes === "function",
    });
    return { ok: true, file: result.payload, filename };
  } catch (err) {
    sideImageLog.error("prepare:failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, message: "Could not prepare photo. Try another image." };
  }
}
