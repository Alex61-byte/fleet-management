import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError, errors } from "./errors.ts";
import type { VehicleSide } from "./domain.ts";

export const MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024;

export type DetectedImage = {
  mime: string;
  ext: string;
};

export type VehicleImageStorage = {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(path: string): Promise<void>;
  signedUrl(path: string): Promise<string>;
};

function asciiAt(bytes: Uint8Array, offset: number, expected: string): boolean {
  if (offset + expected.length > bytes.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected.charCodeAt(i)) return false;
  }
  return true;
}

function ftypBrand(bytes: Uint8Array, brand: string): boolean {
  if (bytes.length < 12) return false;
  if (!asciiAt(bytes, 4, "ftyp")) return false;
  return asciiAt(bytes, 8, brand);
}

function ftypCompatible(bytes: Uint8Array, brand: string): boolean {
  if (bytes.length < 12 || !asciiAt(bytes, 4, "ftyp")) return false;
  if (asciiAt(bytes, 8, brand)) return true;
  for (let i = 16; i + 4 <= Math.min(bytes.length, 64); i += 4) {
    if (asciiAt(bytes, i, brand)) return true;
  }
  return false;
}

/**
 * Detect image type from magic bytes. Accepts any recognized image container;
 * rejects non-images. Client Content-Type is not trusted.
 */
export function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 8) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  if (asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a")) {
    return { mime: "image/gif", ext: "gif" };
  }

  if (bytes.length >= 12 && asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP")) {
    return { mime: "image/webp", ext: "webp" };
  }

  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return { mime: "image/bmp", ext: "bmp" };
  }

  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  ) {
    return { mime: "image/tiff", ext: "tif" };
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    (bytes[2] === 0x01 || bytes[2] === 0x02) &&
    bytes[3] === 0x00
  ) {
    return { mime: "image/x-icon", ext: "ico" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x0c &&
    asciiAt(bytes, 4, "jP  ")
  ) {
    return { mime: "image/jp2", ext: "jp2" };
  }

  if (ftypCompatible(bytes, "avif") || ftypBrand(bytes, "avis")) {
    return { mime: "image/avif", ext: "avif" };
  }
  if (
    ftypCompatible(bytes, "heic") ||
    ftypCompatible(bytes, "heix") ||
    ftypCompatible(bytes, "mif1") ||
    ftypCompatible(bytes, "msf1") ||
    ftypCompatible(bytes, "heif")
  ) {
    const ext =
      ftypCompatible(bytes, "heic") || ftypCompatible(bytes, "heix") ? "heic" : "heif";
    return { mime: "image/heic", ext };
  }

  if (asciiAt(bytes, 0, "8BPS")) {
    return { mime: "image/vnd.adobe.photoshop", ext: "psd" };
  }

  if (bytes[0] === 0x76 && bytes[1] === 0x2f && bytes[2] === 0x31 && bytes[3] === 0x01) {
    return { mime: "image/x-exr", ext: "exr" };
  }

  if (asciiAt(bytes, 0, "#?RADIANCE") || asciiAt(bytes, 0, "#?RGBE")) {
    return { mime: "image/vnd.radiance", ext: "hdr" };
  }

  {
    let i = 0;
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3;
    while (
      i < bytes.length &&
      (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)
    ) {
      i++;
    }
    const head = Buffer.from(bytes.subarray(i, Math.min(bytes.length, i + 256)))
      .toString("utf8")
      .toLowerCase();
    if (head.startsWith("<?xml") && head.includes("<svg")) {
      return { mime: "image/svg+xml", ext: "svg" };
    }
    if (head.startsWith("<svg")) {
      return { mime: "image/svg+xml", ext: "svg" };
    }
  }

  return null;
}

export function sideObjectKey(
  companyId: string,
  vehicleId: string,
  side: VehicleSide,
  ext: DetectedImage["ext"],
): string {
  return `${companyId}/${vehicleId}/${side.toLowerCase()}.${ext}`;
}

/** ADR-015 — damage image object key under handover namespace. */
export function handoverDamageObjectKey(
  companyId: string,
  vehicleId: string,
  handoverId: string,
  imageId: string,
  ext: DetectedImage["ext"],
): string {
  return `${companyId}/${vehicleId}/handovers/${handoverId}/${imageId}.${ext}`;
}

export const MAX_HANDOVER_DAMAGE_IMAGES = 10;

export function parseVehicleSide(raw: string): VehicleSide {
  const side = raw.trim().toUpperCase();
  if (side === "FRONT" || side === "LEFT" || side === "RIGHT" || side === "BACK") {
    return side;
  }
  throw errors.validation("side must be FRONT, LEFT, RIGHT, or BACK");
}

export class MemoryVehicleImageStorage implements VehicleImageStorage {
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();

  async upload(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    this.objects.set(path, { bytes: new Uint8Array(bytes), contentType });
  }

  async remove(path: string): Promise<void> {
    this.objects.delete(path);
  }

  async signedUrl(path: string): Promise<string> {
    if (!this.objects.has(path)) {
      throw storageUnavailable(`memory miss path=${path}`);
    }
    return `memory://vehicle-images/${path}`;
  }
}

function storageUnavailable(cause?: string): AppError {
  if (cause) {
    console.error(`@fleet/api vehicle image storage: ${cause}`);
  }
  return new AppError(503, "storage_unavailable", "Image storage is unavailable.");
}

function envTrim(env: NodeJS.ProcessEnv, ...names: string[]): string | undefined {
  for (const name of names) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Same shape as management-platform `S3ObjectStorage` (ADR-030):
 * Supabase Storage S3 gateway via @aws-sdk/client-s3.
 */
export type S3VehicleImageStorageConfig = {
  bucket: string;
  region: string;
  endpoint: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  ttlSec: number;
};

export class S3VehicleImageStorage implements VehicleImageStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttlSec: number;

  constructor(config: S3VehicleImageStorageConfig) {
    this.bucket = config.bucket;
    this.ttlSec = config.ttlSec;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: Buffer.from(bytes),
          ContentType: contentType,
          ContentLength: bytes.byteLength,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw storageUnavailable(`s3 put bucket=${this.bucket} key=${path}: ${message}`);
    }
  }

  async remove(path: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") return;
      const message = err instanceof Error ? err.message : String(err);
      throw storageUnavailable(`s3 delete bucket=${this.bucket} key=${path}: ${message}`);
    }
  }

  async signedUrl(path: string): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
        { expiresIn: this.ttlSec },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw storageUnavailable(`s3 sign bucket=${this.bucket} key=${path}: ${message}`);
    }
  }
}

export type VehicleImageStorageFromEnvResult = {
  storage: VehicleImageStorage | null;
  status: string;
};

/**
 * Normalize to Supabase S3 gateway URL:
 * `https://<ref>.storage.supabase.co/storage/v1/s3`
 */
export function resolveSupabaseS3Endpoint(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const storageHost = parsed.hostname.match(/^([a-z0-9-]+)\.storage\.supabase\.co$/i);
  if (storageHost) {
    return `${parsed.protocol}//${storageHost[1].toLowerCase()}.storage.supabase.co/storage/v1/s3`;
  }

  const projectHost = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (projectHost && !parsed.hostname.includes("storage.")) {
    return `${parsed.protocol}//${projectHost[1].toLowerCase()}.storage.supabase.co/storage/v1/s3`;
  }

  return null;
}

/**
 * Resolve vehicle image storage the same way management-platform resolves ObjectStorage:
 * S3-compatible Supabase Storage gateway (OBJECT_STORAGE_*).
 *
 * Also accepts fleet-local aliases (SUPABASE_S3_* / legacy SUPABASE_URL as endpoint).
 */
export function vehicleImageStorageFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): VehicleImageStorage | null {
  return vehicleImageStorageFromEnvDetailed(env).storage;
}

export function vehicleImageStorageFromEnvDetailed(
  env: NodeJS.ProcessEnv = process.env,
): VehicleImageStorageFromEnvResult {
  const driver = (envTrim(env, "OBJECT_STORAGE_DRIVER") ?? "supabase").toLowerCase();
  if (driver === "off" || driver === "none" || driver === "disabled") {
    return { storage: null, status: "disabled (OBJECT_STORAGE_DRIVER=off)" };
  }

  const endpointRaw =
    envTrim(env, "OBJECT_STORAGE_ENDPOINT", "SUPABASE_S3_ENDPOINT", "S3_ENDPOINT") ||
    envTrim(env, "SUPABASE_URL");

  const accessKeyId = envTrim(
    env,
    "OBJECT_STORAGE_ACCESS_KEY_ID",
    "SUPABASE_S3_ACCESS_KEY_ID",
    "AWS_ACCESS_KEY_ID",
    "S3_ACCESS_KEY_ID",
  );
  const secretAccessKey = envTrim(
    env,
    "OBJECT_STORAGE_SECRET_ACCESS_KEY",
    "SUPABASE_S3_SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "S3_SECRET_ACCESS_KEY",
  );

  // Do not treat service_role JWT as S3 secret
  const looksJwt = (v: string | undefined) => Boolean(v && v.startsWith("eyJ") && v.split(".").length === 3);

  if (!endpointRaw && !accessKeyId && !secretAccessKey) {
    return {
      storage: null,
      status:
        "disabled (set OBJECT_STORAGE_ENDPOINT + OBJECT_STORAGE_ACCESS_KEY_ID + OBJECT_STORAGE_SECRET_ACCESS_KEY like management-platform)",
    };
  }

  if (!endpointRaw) {
    return {
      storage: null,
      status: "disabled (OBJECT_STORAGE_ENDPOINT required — Supabase Storage → S3 → Endpoint)",
    };
  }

  const endpoint = resolveSupabaseS3Endpoint(endpointRaw) ?? endpointRaw.replace(/\/+$/, "");

  if (!accessKeyId || !secretAccessKey) {
    return {
      storage: null,
      status:
        "disabled (OBJECT_STORAGE_ACCESS_KEY_ID + OBJECT_STORAGE_SECRET_ACCESS_KEY required — Storage → S3 → Access keys; not service_role JWT)",
    };
  }

  if (looksJwt(accessKeyId) || looksJwt(secretAccessKey)) {
    return {
      storage: null,
      status:
        "disabled (S3 access keys required; service_role JWT is not valid for the Supabase S3 gateway)",
    };
  }

  const bucket =
    envTrim(env, "OBJECT_STORAGE_BUCKET", "SUPABASE_VEHICLE_IMAGES_BUCKET") || "vehicle-images";
  const region = envTrim(env, "OBJECT_STORAGE_REGION", "SUPABASE_S3_REGION", "AWS_REGION") || "eu-west-2";
  const forcePathStyle =
    (envTrim(env, "OBJECT_STORAGE_FORCE_PATH_STYLE") ?? "true").toLowerCase() === "true";
  const ttlRaw = Number(envTrim(env, "VEHICLE_IMAGE_SIGNED_URL_TTL_SEC") ?? 3600);
  const ttlSec = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 3600;

  let host = "invalid";
  try {
    host = new URL(endpoint).host;
  } catch {
    /* keep invalid */
  }

  return {
    storage: new S3VehicleImageStorage({
      bucket,
      region,
      endpoint,
      forcePathStyle,
      accessKeyId,
      secretAccessKey,
      ttlSec,
    }),
    status: `enabled via S3 (host ${host}, region ${region}, bucket ${bucket}, pathStyle ${forcePathStyle})`,
  };
}
