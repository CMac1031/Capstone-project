import "../styles/Navbar.css";
import "../styles/Login.css";
import Login from "./Login";
import { useAuth } from "../hooks/useAuth"; //handled from provider.
import Account from "./Account";
import type { KeyboardEvent } from "react";

function Logout() {
    const { logout } = useAuth();
    /**
     * This sub-component will render the Logout button
     * As well as the Account component
     */

        // A div with role="button" gets none of a real button's keyboard
        // behaviour, so Enter and Space have to be wired up by hand. Without
        // this, the control is reachable by tab and impossible to activate.
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                logout();
            }
        };

    return (
        <>
            <div className="logout-container">
                <div
                    className="login-button-box"
                    onClick={logout}
                    onKeyDown={handleKeyDown}
                    role="button"
                    tabIndex={0}
                >
                    <span className="login-button-label">Logout</span>
                </div>
                <Account />
            </div>
        </>
    );
}

function Logo() {
    return (
        <h1 className="Logo">
            <img src="/pnc-logo.png" alt="" className="logo-mark" />
            {/* Visible to screen readers only. The page still needs an h1,
                and Navbar.test.tsx asserts the heading is named exactly
                "NORTHSTAR CRM" - this keeps both true with nothing on screen
                but the mark. */}
            <span className="visually-hidden">NORTHSTAR CRM</span>
        </h1>
    );
}

export default function Navbar() {

    const { user } = useAuth();

    return (
        <>
            <nav id="navbar-container" aria-label="Main">
                <div>
                    <Logo />
                </div>

                <div>
                    {user.permission === null ? <Login /> : <Logout />}
                </div>

            </nav>
        </>
    );
}