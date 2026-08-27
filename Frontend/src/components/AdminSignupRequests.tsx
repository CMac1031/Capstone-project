/**
 * AdminSignupRequests.tsx
 *
 * Admin-only queue of pending "Create account" requests. Backend already
 * enforces this is ADMIN-only (403 for anyone else); the sidebar just
 * doesn't show the link to non-admins so nobody hits a dead end.
 *
 * Approve lets the admin pick a role (defaults to AGENT, matching
 * SignupService's default when none is sent). Reject just closes the
 * request -- no account gets created either way until approve succeeds.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "../styles/AdminSignupRequests.css";

const ENDPOINT = "/api/admin/signup-requests";

interface PendingRequest {
    id: string;
    username: string;
    status: string;
    requestedAt: string;
}

type Role = "AGENT" | "ADMIN";

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const body = await res.json();
        if (typeof body?.detail === "string") return body.detail;
    } catch {
        // not JSON -- fall through
    }
    return fallback;
}

export default function AdminSignupRequests() {
    const { user } = useAuth();

    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [roleChoice, setRoleChoice] = useState<Record<string, Role>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingActionId, setPendingActionId] = useState<string | null>(null);

    async function loadRequests() {
        setIsLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(ENDPOINT, {
                headers: { Authorization: `Bearer ${user.jwt}` },
            });
            if (!res.ok) throw new Error("Couldn't load signup requests.");
            const data: PendingRequest[] = await res.json();
            setRequests(data);
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : "Couldn't load signup requests.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const roleFor = (id: string): Role => roleChoice[id] ?? "AGENT";

    const setRoleFor = (id: string, role: Role) => {
        setRoleChoice((prev) => ({ ...prev, [id]: role }));
    };

    const approve = async (id: string) => {
        setPendingActionId(id);
        setActionError(null);
        try {
            const res = await fetch(`${ENDPOINT}/${id}/approve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.jwt}`,
                },
                body: JSON.stringify({ role: roleFor(id) }),
            });
            if (!res.ok) {
                const message = await extractErrorMessage(res, "Couldn't approve this request.");
                throw new Error(message);
            }
            setRequests((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Couldn't approve this request.");
        } finally {
            setPendingActionId(null);
        }
    };

    const reject = async (id: string) => {
        setPendingActionId(id);
        setActionError(null);
        try {
            const res = await fetch(`${ENDPOINT}/${id}/reject`, {
                method: "POST",
                headers: { Authorization: `Bearer ${user.jwt}` },
            });
            if (!res.ok) {
                const message = await extractErrorMessage(res, "Couldn't reject this request.");
                throw new Error(message);
            }
            setRequests((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Couldn't reject this request.");
        } finally {
            setPendingActionId(null);
        }
    };

    return (
        <div className="admin-requests-screen">
            <div className="admin-requests-header">
                <div>
                    <p className="admin-requests-eyebrow">Overview</p>
                    <h1 className="admin-requests-title">Signup requests</h1>
                </div>
                {requests.length > 0 && <span className="admin-requests-count">{requests.length} pending</span>}
            </div>

            <div className="admin-requests-card">
                {isLoading && <p className="admin-requests-state">Loading requests...</p>}
                {loadError && <p className="admin-requests-state admin-requests-state--error">{loadError}</p>}

                {!isLoading && !loadError && requests.length === 0 && (
                    <p className="admin-requests-state">No pending requests right now.</p>
                )}

                {!isLoading && !loadError && requests.length > 0 && (
                    <table className="admin-requests-table">
                        <thead>
                        <tr>
                            <th>Username</th>
                            <th>Requested</th>
                            <th>Role on approval</th>
                            <th className="admin-requests-actions-head">Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {requests.map((r) => (
                            <tr key={r.id}>
                                <td className="admin-requests-mono">{r.username}</td>
                                <td>{timeAgo(r.requestedAt)}</td>
                                <td>
                                    <select
                                        className="admin-requests-role-select"
                                        value={roleFor(r.id)}
                                        onChange={(e) => setRoleFor(r.id, e.target.value as Role)}
                                        disabled={pendingActionId === r.id}
                                    >
                                        <option value="AGENT">AGENT</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </td>
                                <td className="admin-requests-actions">
                                    <button
                                        type="button"
                                        className="admin-requests-approve"
                                        onClick={() => approve(r.id)}
                                        disabled={pendingActionId === r.id}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-requests-reject"
                                        onClick={() => reject(r.id)}
                                        disabled={pendingActionId === r.id}
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}

                {actionError && <p className="admin-requests-error">{actionError}</p>}
            </div>
        </div>
    );
}