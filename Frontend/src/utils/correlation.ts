/**
 * correlation.ts
 *
 * One id per outbound request, so a single user action can be traced across
 * the browser, the API, PostgreSQL and Kafka by grepping one value.
 *
 * The backend reads this as the X-Correlation-Id header. When no header
 * arrives it falls back to its own default, which is why the demo still
 * shows lab-request-001 today.
 */

/** Demo override: add ?correlationId=lab-request-001 to the URL to pin it. */
function overrideFromUrl(): string | null {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("correlationId");
    return value && value.trim() ? value.trim() : null;
}

export function newCorrelationId(): string {
    const pinned = overrideFromUrl();
    if (pinned) return pinned;

    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    // Fallback for environments without crypto.randomUUID (older jsdom).
    return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}