/**
 * useAuth.test.tsx
 *
 * Unit tests for the AuthProvider / useAuth hook. Tokens come from
 * mockJwt.ts and network calls go through a mocked `fetch`, so these
 * tests never touch a real backend or JWT library.
 *
 * Two AuthProvider configurations are used throughout:
 *   - `wrapper` (refreshLeadMs: 0, activityWindowMs: 0): the refresh
 *     check lands exactly at real expiry, and the user is essentially
 *     never "recently active" enough to qualify for a refresh. This
 *     isolates tests that are about basic login/logout/expiry mechanics
 *     from the refresh feature entirely.
 *   - `makeWrapper({...})`: used by the refresh-focused tests below to
 *     set realistic, fast-for-testing lead/activity windows.
 */

import React, { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../src/hooks/useAuth";
import {
  createMockJwt,
  createMockJwtExpiringIn,
  createExpiredMockJwt,
  createMalformedJwt,
} from "../MockJWT";

// Mirrors the hook's internal cap on a single setTimeout delay (~24.8 days).
const MAX_SINGLE_TIMEOUT_MS = 2_147_483_647;

function makeWrapper(
  overrides: {
    refreshLeadMs?: number;
    activityWindowMs?: number;
    refreshEndpoint?: string;
  } = {}
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider refreshLeadMs={0} activityWindowMs={0} {...overrides}>
        {children}
      </AuthProvider>
    );
  };
}

// Default wrapper for tests unrelated to the refresh feature (see header comment).
const wrapper = makeWrapper();

beforeEach(() => {
  // Stub fetch globally so any unexpected refresh attempt fails loudly
  // (via a rejected/`ok: false` response) rather than hitting the network.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("using useAuth without a surrounding provider", () => {
  it("fails loudly instead of silently returning bad data", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });
});

describe("before anyone has logged in", () => {
  it("treats the visitor as a guest with no permission", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual({ username: "", permission: null, jwt: "" });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAgent).toBe(false);
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("logging in with a valid token", () => {
  it("recognizes an Admin and stores their session details", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(3600);

    act(() => result.current.login("admin1", "ADMIN", jwt));

    expect(result.current.user).toEqual({
      username: "admin1",
      permission: "ADMIN",
      jwt,
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAgent).toBe(false);
  });

  it("recognizes an Agent as authenticated but not an Admin", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(3600);

    act(() => result.current.login("agent1", "AGENT", jwt));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAgent).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("records when the session will expire, based on the token", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(3600);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));

    const expectedExpiry = Math.floor(Date.now() / 1000 + 3600) * 1000;
    expect(result.current.expiresAt).toBeCloseTo(expectedExpiry, -2);
  });
});

describe("logging in with an unusable token", () => {
  it("refuses a token that has already expired", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createExpiredMockJwt();

    act(() => result.current.login("agent@example.com", "AGENT", jwt));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user.permission).toBeNull();
  });

  it("refuses a token that isn't a real JWT", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMalformedJwt();

    act(() => result.current.login("agent@example.com", "AGENT", jwt));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user.permission).toBeNull();
  });
});

describe("logging out", () => {
  it("returns the session to a logged-out, guest state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(3600);

    act(() => result.current.login("admin1", "ADMIN", jwt));
    expect(result.current.isAuthenticated).toBe(true);

    act(() => result.current.logout());

    expect(result.current.user).toEqual({ username: "", permission: null, jwt: "" });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("automatic logout when a session goes unused", () => {
  // These use the refresh-neutral `wrapper` (see header comment), so they
  // isolate the plain expiry-timer mechanics from the refresh feature.

  it("keeps the user logged in before their token's time is up", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(5);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    act(() => vi.advanceTimersByTime(4000));

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logs the user out on its own once the token's time is up", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(5);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5001);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user.permission).toBeNull();
  });

  it("restarts the countdown when a newer session replaces an older one", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuth(), { wrapper });
    const soonToExpire = createMockJwtExpiringIn(2);
    const longerLived = createMockJwtExpiringIn(10);

    act(() => result.current.login("first", "AGENT", soonToExpire));
    act(() => result.current.login("second", "ADMIN", longerLived));

    // Past the first token's expiry, but well within the second's.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.username).toBe("second");

    // Now past the second token's expiry too.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("keeps rescheduling itself for a token that outlives a single timer", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(30 * 24 * 60 * 60); // 30 days out

    act(() => result.current.login("agent@example.com", "AGENT", jwt));

    // First timer fires at the cap, before the real 30-day expiry — still logged in.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_SINGLE_TIMEOUT_MS);
    });
    expect(result.current.isAuthenticated).toBe(true);

    // Advancing past the remainder reaches the real expiry.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        30 * 24 * 60 * 60 * 1000 - MAX_SINGLE_TIMEOUT_MS + 1000
      );
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("cancels the pending timer so it can't fire after the app unmounts", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });
    const jwt = createMockJwtExpiringIn(3600);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe("silently refreshing an active session", () => {
  it("requests a new token when the user has interacted recently", async () => {
    vi.useFakeTimers();
    const freshJwt = createMockJwtExpiringIn(3600);
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jwt: freshJwt }) });
    vi.stubGlobal("fetch", fetchMock);

    const activeWrapper = makeWrapper({ refreshLeadMs: 2000, activityWindowMs: 10_000 });
    const { result } = renderHook(() => useAuth(), { wrapper: activeWrapper });
    const jwt = createMockJwtExpiringIn(5); // lead check at t=3s

    act(() => result.current.login("agent@example.com", "AGENT", jwt));

    act(() => {
      vi.advanceTimersByTime(2000);
      window.dispatchEvent(new Event("mousemove")); // proves the user is still here
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500); // crosses the t=3s check
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.jwt).toBe(freshJwt);
  });

  it("does not request a refresh if the user has gone idle", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const idleWrapper = makeWrapper({ refreshLeadMs: 2000, activityWindowMs: 500 });
    const { result } = renderHook(() => useAuth(), { wrapper: idleWrapper });
    const jwt = createMockJwtExpiringIn(5); // lead check at t=3s

    act(() => result.current.login("agent@example.com", "AGENT", jwt));

    // No activity dispatched — the mount-time activity is well outside the 500ms window by t=3s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true); // real expiry (t=5s) not reached yet

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000); // now past the real expiry
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs the user out immediately if the refresh request is rejected", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const activeWrapper = makeWrapper({ refreshLeadMs: 2000, activityWindowMs: 10_000 });
    const { result } = renderHook(() => useAuth(), { wrapper: activeWrapper });
    const jwt = createMockJwtExpiringIn(5);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    act(() => {
      vi.advanceTimersByTime(2000);
      window.dispatchEvent(new Event("keydown"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs the user out if the refresh response has no usable token", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ notAJwt: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const activeWrapper = makeWrapper({ refreshLeadMs: 2000, activityWindowMs: 10_000 });
    const { result } = renderHook(() => useAuth(), { wrapper: activeWrapper });
    const jwt = createMockJwtExpiringIn(5);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    act(() => {
      vi.advanceTimersByTime(2000);
      window.dispatchEvent(new Event("mousedown"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs the user out if the refreshed token itself has no readable expiry", async () => {
    vi.useFakeTimers();
    const tokenWithNoExp = createMockJwt(); // well-formed, but missing the exp claim
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jwt: tokenWithNoExp }) });
    vi.stubGlobal("fetch", fetchMock);

    const activeWrapper = makeWrapper({ refreshLeadMs: 2000, activityWindowMs: 10_000 });
    const { result } = renderHook(() => useAuth(), { wrapper: activeWrapper });
    const jwt = createMockJwtExpiringIn(5);

    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    act(() => {
      vi.advanceTimersByTime(2000);
      window.dispatchEvent(new Event("mousedown"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("checks for a refresh immediately when the token's lifetime is shorter than the lead time", async () => {
    // This is the scenario that used to break the plain expiry tests: with
    // the default 30s refreshLeadMs and a token that lives only 5s, the
    // "should I refresh?" check point is already in the past the instant
    // login() runs, so it fires right away rather than waiting for a timer.
    vi.useFakeTimers();
    const freshJwt = createMockJwtExpiringIn(3600);
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ jwt: freshJwt }) });
    vi.stubGlobal("fetch", fetchMock);

    // Default wrapper props here (no overrides) — real 30s refreshLeadMs, real 5min activityWindowMs.
    function defaultActiveWrapper({ children }: { children: ReactNode }) {
      return <AuthProvider>{children}</AuthProvider>;
    }

    const { result } = renderHook(() => useAuth(), { wrapper: defaultActiveWrapper });
    const jwt = createMockJwtExpiringIn(5); // lives 5s; default lead time is 30s

    await act(async () => {
      result.current.login("agent1", "AGENT", jwt);
      await vi.advanceTimersByTimeAsync(0); // flush the immediately-triggered refresh
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.jwt).toBe(freshJwt);
  });

  it("only listens for activity while a session is active", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    // Logged out: no activity listeners should be attached.
    expect(addSpy).not.toHaveBeenCalledWith("mousemove", expect.any(Function), expect.anything());

    const jwt = createMockJwtExpiringIn(3600);
    act(() => result.current.login("agent@example.com", "AGENT", jwt));
    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function), expect.anything());

    act(() => result.current.logout());
    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));

    unmount();
  });
});