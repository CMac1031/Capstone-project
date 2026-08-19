/**
 * useAuth.tsx
 *
 * Global auth context + hook for the CRM app.
 *
 * Usage:
 *   1. Wrap your app (or router) in <AuthProvider> once, near the root.
 *   2. Call `useAuth()` from any descendant component to read the current
 *      user and permission, or to log in / out.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type User, type Permission, GUEST_USER, TEST_ADMIN } from "../types/AuthTypes";

interface AuthContextValue {
  /** The current user. `user.permission` is null when nobody is logged in. */
  user: User;
  /** True once a user has successfully logged in (permission is not null). */
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  /**
   * Call after a successful login API call, passing the values returned
   * by the server (email you already have, permission + jwt from the response).
   */
  login: (email: string, permission: Permission, jwt: string) => void;
  /** Clears the session and returns the user to the guest / logged-out state. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // const [user, setUser] = useState<User>(TEST_ADMIN);
  const [user, setUser] = useState<User>(GUEST_USER);
  

  const login = useCallback(
    (email: string, permission: Permission, jwt: string) => {
      setUser({ email, permission, jwt });
    },
    []
  );

  const logout = useCallback(() => {
    setUser(GUEST_USER);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user.permission !== null,
      isAdmin: user.permission === "ADMIN",
      isAgent: user.permission === "AGENT",
      login,
      logout,
    }),
    [user, login, logout]
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