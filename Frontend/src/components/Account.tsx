
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "../styles/Account.css";

export default function Account(){
    /**
     * @returns Account Component
     * This is the account Icon and subsequent overlay
     * It should display the account.svg icon
     * When clicked, an overlay pops up showing the User's email
     * and the User's permission level. 
     * 
     * 
     */


    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, []);

    const permissionLabel = user.permission ?? "Guest";

    return (
        <div ref={wrapperRef} className="account-wrapper">
            <img
                src="account.svg"
                alt="account"
                onClick={() => setOpen((s) => !s)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((s) => !s); }}
                className="account-icon"
                tabIndex={0}
            />

            {open && (
                <div
                    role="dialog"
                    aria-label="Account details"
                    className="account-popover"
                >
                    <div className="account-row"><strong>Email:</strong> {user.email || "Not signed in"}</div>
                    <div className="account-row"><strong>Permission:</strong> {permissionLabel}</div>
                </div>
            )}
        </div>
    );
}