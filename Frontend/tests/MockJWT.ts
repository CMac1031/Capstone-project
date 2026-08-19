/**
 * mockJwt.ts (test helper)
 *
 * Builds fake JWT strings so tests never depend on a real backend, a real
 * signing key, or a JWT library. This stands in for "the API response" —
 * only the payload (specifically `exp`) matters to useAuth.tsx, since it
 * never verifies the signature client-side.
 */

function base64UrlEncode(value: object): string {
  const json = JSON.stringify(value);
  const base64 = btoa(json);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface MockJwtOptions {
  /** Expiry as seconds-since-epoch, matching the standard `exp` claim. Omit to produce a token with no exp claim. */
  exp?: number;
}

/** A well-formed three-part JWT with a controllable (or missing) `exp` claim. */
export function createMockJwt({ exp }: MockJwtOptions = {}): string {
  const header = base64UrlEncode({ alg: "none", typ: "JWT" });
  const payload = base64UrlEncode(exp === undefined ? {} : { exp });
  return `${header}.${payload}.mock-signature`;
}

/** Convenience: a token that expires `secondsFromNow` seconds in the future. */
export function createMockJwtExpiringIn(secondsFromNow: number): string {
  return createMockJwt({ exp: Math.floor(Date.now() / 1000) + secondsFromNow });
}

/** Convenience: a token that already expired `secondsAgo` seconds in the past. */
export function createExpiredMockJwt(secondsAgo = 60): string {
  return createMockJwt({ exp: Math.floor(Date.now() / 1000) - secondsAgo });
}

/** A token that isn't valid JWT shape at all (only one segment). */
export function createMalformedJwt(): string {
  return "not-a-real-token";
}