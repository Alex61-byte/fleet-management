/**
 * Pure helpers for mobile API base URL (no React Native runtime required).
 */

/** Extract host from Expo `hostUri` (`192.168.1.10:8081`) or URL (`exp://192.168.1.10:8081`). */
export function hostFromExpoUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes("://")) {
      const hostname = new URL(trimmed).hostname;
      return hostname || null;
    }
  } catch {
    /* fall through */
  }
  // host:port or host only (no scheme)
  const withoutPath = trimmed.split("/")[0] ?? "";
  const host = withoutPath.includes("]")
    ? withoutPath.slice(0, withoutPath.indexOf("]") + 1) // [ipv6]
    : withoutPath.split(":")[0];
  return host || null;
}

export function pickLanApiBase(candidates: Array<string | null | undefined>, port = 3001): string | null {
  for (const candidate of candidates) {
    const host = hostFromExpoUri(typeof candidate === "string" ? candidate : null);
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:${port}`;
    }
  }
  return null;
}
