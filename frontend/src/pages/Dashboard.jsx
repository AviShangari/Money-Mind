import { useEffect, useState } from "react";
import api from "../api/axiosClient";
import Transactions from "./Transactions";

function Dashboard() {
    const [userEmail, setUserEmail] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await api.get("/protected/me");
                setUserEmail(res.data.user_email);
            } catch (err) {
                console.log(err);
                window.location.href = "/";
            }
        }

        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
            window.location.href = "/";
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
            {/* Sidebar */}
            <aside style={{
                width: "260px",
                background: "var(--bg-secondary)",
                borderRight: "1px solid var(--border)",
                padding: "2rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                position: "fixed",
                height: "100vh"
            }}>
                <div style={{ marginBottom: "3rem", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ fontSize: "1.5rem" }}>💸</div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Money Mind</h2>
                </div>

                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <NavButton
                        label="Overview"
                        active={activeTab === "overview"}
                        onClick={() => setActiveTab("overview")}
                    />
                    <NavButton
                        label="Transactions"
                        active={activeTab === "transactions"}
                        onClick={() => setActiveTab("transactions")}
                    />
                </nav>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                    <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                        {userEmail}
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            width: "100%",
                            padding: "10px",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: "260px", flex: 1, display: "flex", flexDirection: "column" }}>
                <header style={{
                    height: "70px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "0 2rem",
                    background: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(8px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10
                }}>
                    <button
                        onClick={handleLogout}
                        className="btn-primary"
                        style={{
                            background: "transparent",
                            border: "1px solid var(--danger)",
                            color: "var(--danger)",
                            padding: "8px 16px",
                            fontSize: "0.9rem"
                        }}
                    >
                        Sign Out
                    </button>
                </header>

                <div style={{ padding: "3rem", flex: 1 }}>
                    {activeTab === "overview" && (
                        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Welcome back</h1>
                            <p style={{ color: "var(--text-secondary)", marginBottom: "3rem" }}>Here is what's happening with your money.</p>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
                                <StatCard title="Total Balance" value="$12,450.00" trend="+2.5%" />
                                <StatCard title="Monthly Spending" value="$1,205.00" trend="-4.1%" />
                                <StatCard title="Savings Goal" value="$5,000.00" trend="50%" />
                            </div>
                        </div>
                    )}

                    {activeTab === "transactions" && (
                        <Transactions />
                    )}

                </div>
            </main>
        </div>
    );
}

function NavButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? "var(--primary)" : "transparent",
                color: active ? "white" : "var(--text-secondary)",
                border: "none",
                textAlign: "left",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.95rem",
                fontWeight: active ? "600" : "500",
                cursor: "pointer",
                width: "100%",
                transition: "all 0.2s"
            }}
        >
            {label}
        </button>
    );
}

function StatCard({ title, value, trend }) {
    return (
        <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{title}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem" }}>{value}</div>
            <div style={{ fontSize: "0.875rem", color: trend.startsWith("+") ? "var(--success)" : "var(--text-secondary)" }}>
                {trend}
            </div>
        </div>
    );
}

export default Dashboard;
