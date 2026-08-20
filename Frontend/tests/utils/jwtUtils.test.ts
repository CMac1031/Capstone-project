/**
 * jwtUtils.test.ts
 *
 * Unit tests for decodeJwt / getJwtExpiryMs / isJwtExpired. These are pure
 * functions with no network or React involved, so tokens from mockJwt.ts
 * are the only "mocking" needed for full isolation.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { decodeJwt, getJwtExpiryMs, isJwtExpired } from "../../src/utils/jwtUtils";
import {
  createMockJwt,
  createMockJwtExpiringIn,
  createExpiredMockJwt,
  createMalformedJwt,
} from "../MockJWT";

afterEach(() => {
  vi.useRealTimers();
});

describe("reading the data encoded in a token", () => {
  it("returns the claims from a well-formed token", () => {
    const jwt = createMockJwt({ exp: 1_700_000_000 });

    expect(decodeJwt(jwt)).toEqual({ exp: 1_700_000_000 });
  });

  it("returns null for a string that isn't shaped like a token at all", () => {
    expect(decodeJwt(createMalformedJwt())).toBeNull();
  });

  it("returns null when the payload segment isn't valid base64/JSON", () => {
    expect(decodeJwt("header.not-valid-base64!!!.signature")).toBeNull();
  });
});

describe("finding out when a token expires", () => {
  it("converts the exp claim from seconds to a millisecond timestamp", () => {
    const jwt = createMockJwt({ exp: 1000 });

    expect(getJwtExpiryMs(jwt)).toBe(1000 * 1000);
  });

  it("returns null for a token with no exp claim at all", () => {
    const jwt = createMockJwt(); // no exp

    expect(getJwtExpiryMs(jwt)).toBeNull();
  });

  it("returns null for a token that can't be decoded in the first place", () => {
    expect(getJwtExpiryMs(createMalformedJwt())).toBeNull();
  });
});

describe("checking whether a token has already expired", () => {
  it("treats a token with a future expiry as still valid", () => {
    const jwt = createMockJwtExpiringIn(3600);

    expect(isJwtExpired(jwt)).toBe(false);
  });

  it("treats a token with a past expiry as expired", () => {
    const jwt = createExpiredMockJwt(60);

    expect(isJwtExpired(jwt)).toBe(true);
  });

  it("treats an unreadable token as expired, to be safe", () => {
    expect(isJwtExpired(createMalformedJwt())).toBe(true);
  });

  it("treats a token missing its exp claim as expired, to be safe", () => {
    const jwt = createMockJwt(); // no exp

    expect(isJwtExpired(jwt)).toBe(true);
  });

  it("treats the exact expiry instant itself as already expired", () => {
    const expirySeconds = Math.floor(Date.now() / 1000) + 100;
    const jwt = createMockJwt({ exp: expirySeconds });

    vi.useFakeTimers();
    vi.setSystemTime(expirySeconds * 1000); // now === exp, to the millisecond

    expect(isJwtExpired(jwt)).toBe(true);
  });
});