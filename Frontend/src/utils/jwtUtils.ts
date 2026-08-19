/**
 * jwtUtils.ts
 *
 * Minimal, dependency-free JWT payload decoding.
 * NOTE: This does NOT verify the token's signature — verification must
 * happen server-side. This is purely for reading claims (like `exp`)
 * client-side to drive UI behavior such as auto-logout.
 */

export interface JwtPayload {
  exp?: number; // seconds since epoch
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decodes the payload of a JWT. Returns null if the token is malformed.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // JWT uses base64url encoding — convert to standard base64 before decoding.
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns the token's expiry as a millisecond epoch timestamp, or null
 * if the token is malformed or has no `exp` claim.
 */
export function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") return null;
  return payload.exp * 1000;
}

/**
 * True if the token is malformed, missing `exp`, or already expired.
 */
export function isJwtExpired(token: string): boolean {
  const expiryMs = getJwtExpiryMs(token);
  if (expiryMs === null) return true;
  return Date.now() >= expiryMs;
}