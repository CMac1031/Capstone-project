import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import Login from "./components/Login";
import Sidebar, { type View } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import AdminSignupRequests from "./components/AdminSignupRequests";
import "./App.css";

function App() {
    const { isAuthenticated } = useAuth();
    const [view, setView] = useState<View>("dashboard");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    if (!isAuthenticated) {
        return <Login />;
    }

    const navigate = (next: View) => {
        setView(next);
        if (next !== "profile") {
            setSelectedCustomerId(null);
        }
    };

    const openCustomer = (customerId: string) => {
        setSelectedCustomerId(customerId);
        setView("profile");
    };

    const backToCustomers = () => {
        setSelectedCustomerId(null);
        setView("dashboard");
    };

    return (
        <div className="app-layout">
            <Sidebar activeView={view} onNavigate={navigate} />
            <main className="app-content">
                {view === "dashboard" && <Dashboard onSelectCustomer={openCustomer} />}
                {view === "profile" && selectedCustomerId && (
                    <Profile customerId={selectedCustomerId} onBack={backToCustomers} />
                )}
                {view === "signup-requests" && <AdminSignupRequests />}
            </main>
        </div>
    );
}

export default App;