/**
 * Dashboard.tsx
 *
 * Landing view after login: stat cards, a searchable/filterable/paginated
 * customer table, and (for admins) a way to add a new customer.
 *
 * Data approach: fetch the id list once, then fetch each customer's full
 * record. Fine for a demo-sized book -- the same "load everything
 * client-side" tradeoff Search.tsx already made, documented as a known
 * limitation at real scale. Pagination here is client-side too (slicing
 * the already-loaded list) rather than asking the server for one page at
 * a time -- same tradeoff, same reason.
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth.tsx";
import type Customer from "../types/Customer.ts";
import { type AccountStatus, ACCOUNT_STATUSES } from "../types/Customer.ts";
import "../styles/Dashboard.css";

const CUSTOMERS_ENDPOINT = "/api/customers";
const PAGE_SIZE = 8;

interface DashboardProps {
    onSelectCustomer: (customerId: string) => void;
}

interface LoadState {
    customers: Customer[];
    isLoading: boolean;
    error: string | null;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    PENDING: "Pending",
    SUSPENDED: "Suspended",
};

const STATUS_FILTERS: Array<AccountStatus | "ALL"> = ["ALL", ...ACCOUNT_STATUSES];

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const body = await res.json();
        if (typeof body?.detail === "string") return body.detail;
    } catch {
        // not JSON -- fall through
    }
    return fallback;
}

export default function Dashboard({ onSelectCustomer }: DashboardProps) {
    const { user, isAdmin } = useAuth();
    const [state, setState] = useState<LoadState>({ customers: [], isLoading: true, error: null });
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<AccountStatus | "ALL">("ALL");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    async function loadCustomers() {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
            const idsRes = await fetch(CUSTOMERS_ENDPOINT, {
                headers: { Authorization: `Bearer ${user.jwt}` },
            });
            if (!idsRes.ok) throw new Error("Failed to load customer ids.");
            const ids: string[] = await idsRes.json();

            const records = await Promise.all(
                ids.map(async (id) => {
                    const res = await fetch(`${CUSTOMERS_ENDPOINT}/${id}`, {
                        headers: { Authorization: `Bearer ${user.jwt}` },
                    });
                    if (!res.ok) return null;
                    return (await res.json()) as Customer;
                })
            );

            setState({
                customers: records.filter((c): c is Customer => c !== null),
                isLoading: false,
                error: null,
            });
        } catch {
            setState({ customers: [], isLoading: false, error: "Couldn't load the customer book. Retry." });
        }
    }

    useEffect(() => {
        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.jwt]);

    const total = state.customers.length;
    const counts: Record<AccountStatus, number> = { ACTIVE: 0, INACTIVE: 0, PENDING: 0, SUSPENDED: 0 };
    state.customers.forEach((c) => {
        counts[c.accountStatus] += 1;
    });

    // Search + status filter, applied client-side over the already-loaded book.
    const visibleCustomers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return state.customers.filter((c) => {
            const matchesStatus = statusFilter === "ALL" || c.accountStatus === statusFilter;
            const matchesSearch =
                term === "" ||
                c.customerId.toLowerCase().includes(term) ||
                c.name.toLowerCase().includes(term) ||
                c.email.toLowerCase().includes(term);
            return matchesStatus && matchesSearch;
        });
    }, [state.customers, searchTerm, statusFilter]);

    // Whenever the visible set changes shape (new search, new filter), jump
    // back to page 1 -- otherwise you can land on a page that no longer exists.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(visibleCustomers.length / PAGE_SIZE));
    const pagedCustomers = visibleCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <p className="dashboard-eyebrow">Overview</p>
                    <h1 className="dashboard-title">Customer book</h1>
                </div>
                <StatusStrip apiOk={!state.error} recordCount={total} />
            </div>

            <div className="dashboard-stats">
                <StatCard label="Total customers" value={total} />
                <StatCard label="Active" value={counts.ACTIVE} tone="active" />
                <StatCard label="Pending" value={counts.PENDING} tone="pending" />
                <StatCard label="Inactive / suspended" value={counts.INACTIVE + counts.SUSPENDED} tone="muted" />
            </div>

            <div className="dashboard-table-card">
                <div className="dashboard-toolbar">
                    <input
                        type="text"
                        className="dashboard-search"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="dashboard-filters">
                        {STATUS_FILTERS.map((status) => (
                            <label key={status} className="dashboard-filter-chip">
                                <input
                                    type="radio"
                                    name="status-filter"
                                    checked={statusFilter === status}
                                    onChange={() => setStatusFilter(status)}
                                />
                                {status === "ALL" ? "All" : STATUS_LABEL[status]}
                            </label>
                        ))}
                    </div>

                    {isAdmin && (
                        <button type="button" className="dashboard-add-button" onClick={() => setIsAddOpen(true)}>
                            + Add customer
                        </button>
                    )}
                </div>

                <div className="dashboard-table-head">
                    <h2>Customers</h2>
                    <span className="dashboard-hint">
            {state.isLoading ? "" : `Showing ${pagedCustomers.length} of ${visibleCustomers.length}`}
          </span>
                </div>

                {state.isLoading && <p className="dashboard-empty">Loading customer book…</p>}
                {state.error && <p className="dashboard-error">{state.error}</p>}

                {!state.isLoading && !state.error && visibleCustomers.length === 0 && (
                    <p className="dashboard-empty">No customers match your search.</p>
                )}

                {!state.isLoading && !state.error && pagedCustomers.length > 0 && (
                    <table className="dashboard-table">
                        <thead>
                        <tr>
                            <th>Customer ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pagedCustomers.map((c) => (
                            <tr key={c.customerId} onClick={() => onSelectCustomer(c.customerId)}>
                                <td className="dashboard-mono">{c.customerId}</td>
                                <td>{c.name}</td>
                                <td className="dashboard-mono">{c.email}</td>
                                <td>
                                    <StatusPill status={c.accountStatus} />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}

                {totalPages > 1 && (
                    <div className="dashboard-pagination">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                            ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={page === currentPage ? "dashboard-page-active" : ""}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                            ›
                        </button>
                    </div>
                )}
            </div>

            {isAddOpen && (
                <AddCustomerModal
                    jwt={user.jwt}
                    onClose={() => setIsAddOpen(false)}
                    onCreated={() => {
                        setIsAddOpen(false);
                        loadCustomers();
                    }}
                />
            )}
        </div>
    );
}

function StatCard({
                      label,
                      value,
                      tone = "default",
                  }: {
    label: string;
    value: number;
    tone?: "default" | "active" | "pending" | "muted";
}) {
    return (
        <div className={`stat-card stat-card--${tone}`}>
            <p className="stat-card-value">{value}</p>
            <p className="stat-card-label">{label}</p>
        </div>
    );
}

function StatusPill({ status }: { status: AccountStatus }) {
    return <span className={`status-pill status-pill--${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}

function StatusStrip({ apiOk, recordCount }: { apiOk: boolean; recordCount: number }) {
    return (
        <div className="status-strip">
            <StatusDot ok={apiOk} label="API" />
            <StatusDot ok={apiOk && recordCount >= 0} label="Database" />
            <StatusDot ok={true} label="Correlation tracing" />
        </div>
    );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className="status-dot-item">
      <span className={`status-dot ${ok ? "status-dot--ok" : "status-dot--down"}`} aria-hidden="true" />
            {label}
    </span>
    );
}

interface AddCustomerModalProps {
    jwt: string;
    onClose: () => void;
    onCreated: () => void;
}

function AddCustomerModal({ jwt, onClose, onCreated }: AddCustomerModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [accountStatus, setAccountStatus] = useState<AccountStatus>("PENDING");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch(CUSTOMERS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ name, email, phone, accountStatus }),
            });

            if (!res.ok) {
                const message = await extractErrorMessage(res, "Couldn't create the customer.");
                throw new Error(message);
            }

            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create the customer.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="dashboard-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dashboard-modal" role="dialog" aria-modal="true">
                <p className="dashboard-modal-title">Add customer</p>
                <p className="dashboard-modal-subtitle">The customer ID is assigned automatically.</p>

                <form onSubmit={submit}>
                    <label className="dashboard-modal-field">
                        <span>Name</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                    </label>

                    <label className="dashboard-modal-field">
                        <span>Email</span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>

                    <label className="dashboard-modal-field">
                        <span>Phone</span>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </label>

                    <label className="dashboard-modal-field">
                        <span>Account status</span>
                        <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}>
                            {ACCOUNT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </label>

                    {error && <p className="dashboard-modal-error">{error}</p>}

                    <div className="dashboard-modal-actions">
                        <button type="submit" className="dashboard-modal-submit" disabled={isSaving}>
                            {isSaving ? "Creating..." : "Create customer"}
                        </button>
                        <button type="button" className="dashboard-modal-cancel" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}