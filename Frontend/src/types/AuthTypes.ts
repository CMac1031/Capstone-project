
/**
 * authTypes.ts
 *
 * Shared types for authentication / authorization across the CRM app.
 */
 
/**
 * The set of roles a logged-in user can have.
 * `null` represents "not logged in yet" (e.g. someone viewing the landing page).
 */
export type Permission = "ADMIN" | "AGENT" | null;
 
/**
 * Represents the currently known user in the app.
 * When no one is logged in, `permission` is null and `username`/`jwt` are empty strings.
 */
export interface User {
  username: string;
  permission: Permission;
  jwt: string;
}
 
/**
 * Default "guest" user — used before login or after logout.
 */
export const GUEST_USER: User = {
  username: "",
  permission: null,
  jwt: "",
};
 
export const TEST_ADMIN: User = {
  username: "admin1",
  permission: "ADMIN",
  jwt: "abcd1234",
};