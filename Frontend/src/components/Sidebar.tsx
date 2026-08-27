/**
 * Sidebar.tsx
 *
 * Fixed left navigation for the signed-in app -- replaces the old top
 * navbar entirely. Dashboard/Customers/Admin requests as nav items;
 * account + logout pinned to the bottom.
 *
 * "Signup requests" only appears for ADMIN -- an AGENT wouldn't be able
 * to use it anyway (backend returns 403), so we don't show a dead end.
 */

import { useAuth } from "../hooks/useAuth";
import "../styles/Sidebar.css";

export type View = "dashboard" | "profile" | "signup-requests";

interface SidebarProps {
    activeView: View;
    onNavigate: (view: View) => void;
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
    const { user, isAdmin, logout } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">
                    <span className="sidebar-logo-brace">{"{"}</span>
                    <span>PNC</span>
                    <span className="sidebar-logo-brace">{"}"}</span>
                </div>
                <p className="sidebar-brand-name">Pretty Nice Code CRM</p>
            </div>

            <nav className="sidebar-nav">
                <button
                    type="button"
                    className={`sidebar-nav-item ${activeView === "dashboard" ? "sidebar-nav-item--active" : ""}`}
                    onClick={() => onNavigate("dashboard")}
                >
                    Customers
                </button>

                {isAdmin && (
                    <button
                        type="button"
                        className={`sidebar-nav-item ${activeView === "signup-requests" ? "sidebar-nav-item--active" : ""}`}
                        onClick={() => onNavigate("signup-requests")}
                    >
                        Signup requests
                    </button>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <span className="sidebar-user-name">{user.username}</span>
                    <span className="sidebar-user-role">{user.permission}</span>
                </div>
                <button type="button" className="sidebar-logout" onClick={logout}>
                    Log out
                </button>
            </div>
        </aside>
    );
}