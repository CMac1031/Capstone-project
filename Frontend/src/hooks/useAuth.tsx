/**
 * useAuth.tsx
 *
 * Global auth context + hook for the CRM app.
 *
 * Usage:
 *   1. Wrap your app (or router) in <AuthProvider> once, near the root.
 *   2. Call `useAuth()` from any descendant component to read the current
 *      user and permission, or to log in / out.
 *
 * Session lifecycle:
 *   - login() decodes the JWT's `exp` claim and rejects tokens that are
 *     already expired or unreadable.
 *   - Shortly before the real expiry (`refreshLeadMs`, default 30s), the
 *     hook checks whether the user has interacted with the page recently
 *     (`activityWindowMs`, default 5 minutes).
 *       - If recently active: it silently requests a new JWT from
 *         `refreshEndpoint` and reschedules around the new expiry.
 *       - If not: no refresh is attempted, and the session is left to
 *         expire naturally, logging the user out at the real expiry.
 *   - A failed refresh logs the user out immediately.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type User, type Permission, GUEST_USER } from "../types/AuthTypes";
import { getJwtExpiryMs, isJwtExpired } from "../utils/jwtUtils";

// setTimeout delays are capped at a 32-bit signed int (~24.8 days). Any
// wait longer than this has to be broken into multiple scheduled checks.
const MAX_TIMEOUT_MS = 2_147_483_647;

const DEFAULT_REFRESH_LEAD_MS = 30_000; // attempt refresh 30s before real expiry
const DEFAULT_ACTIVITY_WINDOW_MS = 5 * 60_000; // must have interacted in the last 5 minutes
const DEFAULT_REFRESH_ENDPOINT = "/api/auth/refresh";

// Any of these firing counts as "the user is still here".
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

interface RefreshResponse {
  jwt: string;
  /** Optional: only needed if your backend can rotate permission on refresh. */
  permission?: Permission;
}

interface AuthContextValue {
  /** The current user. `user.permission` is null when nobody is logged in. */
  user: User;
  /** True once a user has successfully logged in (permission is not null). */
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  /** Epoch ms when the current session's JWT expires, or null if not logged in. */
  expiresAt: number | null;
  /** True while a silent token refresh is in flight. */
  isRefreshing: boolean;
  /**
   * Call after a successful login API call, passing the values returned
  * by the server (username you already have, permission + jwt from the response).
   * If the token is already expired (or has no readable `exp` claim), the
   * login is rejected and the user stays logged out.
   */
  login: (username: string, permission: Permission, jwt: string) => void;
  /** Clears the session and returns the user to the guest / logged-out state. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  /** How long before the JWT's real expiry to attempt a silent refresh. Default 30s. */
  refreshLeadMs?: number;
  /** How recently the user must have interacted with the page to qualify for a refresh. Default 5 minutes. */
  activityWindowMs?: number;
  /** Endpoint that exchanges the current (soon-to-expire) JWT for a new one. Defaults to "/api/auth/refresh". */
  refreshEndpoint?: string;
}

export function AuthProvider({
  children,
  refreshLeadMs = DEFAULT_REFRESH_LEAD_MS,
  activityWindowMs = DEFAULT_ACTIVITY_WINDOW_MS,
  refreshEndpoint = DEFAULT_REFRESH_ENDPOINT,
}: AuthProviderProps) {
  const [user, setUser] = useState<User>(GUEST_USER);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Config and latest user/activity are kept in refs so the scheduling
  // functions below can stay simple closures without needing to be
  // re-created (and re-memoized) every time a prop or state value changes.
  const configRef = useRef({ refreshLeadMs, activityWindowMs, refreshEndpoint });
  const userRef = useRef<User>(user);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    configRef.current = { refreshLeadMs, activityWindowMs, refreshEndpoint };
  }, [refreshLeadMs, activityWindowMs, refreshEndpoint]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isAuthenticated = user.permission !== null;

  // Track user activity only while a session is active — no point paying
  // for global listeners on the logged-out landing page.
  useEffect(() => {
    if (!isAuthenticated) return;

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, markActive, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, markActive)
      );
    };
  }, [isAuthenticated]);

  const logout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setUser(GUEST_USER);
    setExpiresAt(null);
    setIsRefreshing(false);
  }, []);

  // Runs `callback` once Date.now() reaches targetMs, re-arming itself as
  // needed so a single wait longer than MAX_TIMEOUT_MS still lands on time.
  function scheduleAt(targetMs: number, callback: () => void) {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const msRemaining = targetMs - Date.now();
    if (msRemaining <= 0) {
      callback();
      return;
    }

    const delay = Math.min(msRemaining, MAX_TIMEOUT_MS);
    timeoutRef.current = setTimeout(() => {
      if (Date.now() >= targetMs) {
        callback();
      } else {
        scheduleAt(targetMs, callback);
      }
    }, delay);
  }

  // Attempts to exchange the current JWT for a new one. On success,
  // updates the session and re-arms the lifecycle timer around the new
  // expiry. On failure, logs out — a rejected refresh means the session
  // can't be trusted to continue.
  async function performRefresh() {
    const { refreshEndpoint: endpoint } = configRef.current;
    const currentJwt = userRef.current.jwt;

    setIsRefreshing(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentJwt}` },
      });
      if (!res.ok) throw new Error("Refresh request failed.");

      const data: RefreshResponse = await res.json();
      if (typeof data.jwt !== "string") {
        throw new Error("Refresh response missing jwt.");
      }

      const newExpiryMs = getJwtExpiryMs(data.jwt);
      if (newExpiryMs === null) {
        throw new Error("Refreshed token has no readable expiry.");
      }

      setUser((prev) => ({
        ...prev,
        jwt: data.jwt,
        permission: data.permission ?? prev.permission,
      }));
      setExpiresAt(newExpiryMs);
      armSessionTimer(newExpiryMs);
    } catch (err) {
      console.warn("Silent token refresh failed; logging out.", err);
      logout();
    } finally {
      setIsRefreshing(false);
    }
  }

  // Fires at (expiry - refreshLeadMs). Decides whether to refresh or let
  // the session ride out to its real expiry, based on recent activity.
  function handleApproachingExpiry(expiryMs: number) {
    if (Date.now() >= expiryMs) {
      logout();
      return;
    }

    const { activityWindowMs: activityWindow } = configRef.current;
    const isRecentlyActive =
      Date.now() - lastActivityRef.current <= activityWindow;

    if (!isRecentlyActive) {
      // Nobody's using the session — let it expire rather than renew it.
      scheduleAt(expiryMs, logout);
      return;
    }

    performRefresh();
  }

  // Arms the check that runs shortly before the given expiry.
  function armSessionTimer(expiryMs: number) {
    const { refreshLeadMs: leadMs } = configRef.current;
    scheduleAt(expiryMs - leadMs, () => handleApproachingExpiry(expiryMs));
  }

  const login = useCallback(
    (username: string, permission: Permission, jwt: string) => {
      if (isJwtExpired(jwt)) {
        console.warn("Login rejected: JWT is missing, invalid, or expired.");
        logout();
        return;
      }

      const expiryMs = getJwtExpiryMs(jwt) as number;
      setUser({ username, permission, jwt });
      setExpiresAt(expiryMs);
      armSessionTimer(expiryMs);
    },
    // armSessionTimer/scheduleAt/etc. are stable in behavior (they read
    // live values via refs) even though they're re-created each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logout]
  );

  // Clean up any pending timer if the provider unmounts.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isAdmin: user.permission === "ADMIN",
      isAgent: user.permission === "AGENT",
      expiresAt,
      isRefreshing,
      login,
      logout,
    }),
    [user, isAuthenticated, expiresAt, isRefreshing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Access the current auth state and mutators.
 * Must be called from a component rendered inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}