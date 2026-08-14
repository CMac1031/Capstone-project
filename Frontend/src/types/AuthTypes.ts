
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
 * When no one is logged in, `permission` is null and `email`/`jwt` are empty strings.
 */
export interface User {
  email: string;
  permission: Permission;
  jwt: string;
}
 
/**
 * Default "guest" user — used before login or after logout.
 */
export const GUEST_USER: User = {
  email: "",
  permission: null,
  jwt: "",
};
 
