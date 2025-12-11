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
        <div className="flex min-h-screen bg-bg-primary text-text-primary">
            {/* Sidebar */}
            <aside className="w-[260px] bg-bg-secondary border-r border-border p-8 flex flex-col fixed h-screen">
                <div className="mb-12 flex items-center gap-2.5">
                    <div className="text-2xl">💸</div>
                    <h2 className="text-xl font-bold text-text-primary m-0">Money Mind</h2>
                </div>

                <nav className="flex-1 flex flex-col gap-2">
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

                <div className="border-t border-border pt-6">
                    <div className="mb-4 text-sm text-text-secondary truncate">
                        {userEmail}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-transparent border border-border text-text-secondary w-full p-2.5 rounded-sm cursor-pointer transition-all duration-200 hover:bg-bg-accent hover:text-text-primary"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-[260px] flex-1 flex flex-col">
                <header className="h-[70px] border-b border-border flex justify-end items-center px-8 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                    {/* Header content can go here in the future */}
                </header>

                <div className="p-12 flex-1">
                    {activeTab === "overview" && (
                        <div className="max-w-5xl mx-auto">
                            <h1 className="text-3xl mb-2 font-bold">Welcome back</h1>
                            <p className="text-text-secondary mb-12">Here is what's happening with your money.</p>

                            <div className="grid grid-cols-3 gap-6">
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
            className={`
                w-full text-left p-3 rounded-sm text-sm transition-all duration-200 cursor-pointer
                ${active
                    ? "bg-brand text-white font-semibold"
                    : "bg-transparent text-text-secondary font-medium hover:bg-bg-accent hover:text-text-primary"}
            `}
        >
            {label}
        </button>
    );
}

function StatCard({ title, value, trend }) {
    const isPositive = trend.startsWith("+") || trend.includes("%") && !trend.startsWith("-");
    return (
        <div className="card p-6">
            <div className="text-text-secondary text-sm mb-2">{title}</div>
            <div className="text-2xl font-bold mb-1 text-text-primary">{value}</div>
            <div className={`text-sm ${isPositive ? "text-success" : "text-text-secondary"}`}>
                {trend}
            </div>
        </div>
    );
}

export default Dashboard;
