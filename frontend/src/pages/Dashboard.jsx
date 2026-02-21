import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosClient";
import Transactions from "./Transactions";
import Budgets from "./Budgets";
import StatCards from "../components/dashboard/StatCards";
import SpendingTrendChart from "../components/dashboard/SpendingTrendChart";
import CategoryDonutChart from "../components/dashboard/CategoryDonutChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import BehavioralInsight from "../components/dashboard/BehavioralInsight";

const MAX_CATEGORY_SLICES = 6;

/** Convert spending_by_category dict → [{name, value}] array for the donut chart. */
function buildCategoryChartData(spendingByCategory) {
    const entries = Object.entries(spendingByCategory)
        .map(([name, value]) => [name, Number(value)])
        .sort(([, a], [, b]) => b - a);

    const top = entries.slice(0, MAX_CATEGORY_SLICES);
    const rest = entries.slice(MAX_CATEGORY_SLICES);

    if (rest.length > 0) {
        const otherTotal = rest.reduce((s, [, v]) => s + v, 0);
        top.push(["Other", otherTotal]);
    }

    return top.map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

function Overview() {
    // Independent loading states so each section can skeleton independently
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [recentTxns, setRecentTxns] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingTrend, setLoadingTrend] = useState(true);
    const [loadingRecent, setLoadingRecent] = useState(true);

    useEffect(() => {
        // Fire all three requests in parallel
        api.get("/insights/summary")
            .then((res) => setSummary(res.data))
            .catch(() => setSummary(null))
            .finally(() => setLoadingSummary(false));

        api.get("/insights/trend")
            .then((res) => setTrend(res.data?.trend ?? []))
            .catch(() => setTrend([]))
            .finally(() => setLoadingTrend(false));

        api.get("/transactions")
            .then((res) => setRecentTxns(res.data.slice(0, 10)))
            .catch(() => setRecentTxns([]))
            .finally(() => setLoadingRecent(false));
    }, []);

    const categoryChartData = summary
        ? buildCategoryChartData(summary.spending_by_category)
        : [];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Overview</h1>
                <p className="text-text-secondary text-sm">Here is what's happening with your money.</p>
            </div>

            {/* Row 1 — 4 stat cards */}
            <StatCards summary={summary} loading={loadingSummary} />

            {/* Row 2 — Trend chart (60%) + Donut chart (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <SpendingTrendChart data={trend} loading={loadingTrend} />
                </div>
                <div className="lg:col-span-2">
                    <CategoryDonutChart data={categoryChartData} loading={loadingSummary} />
                </div>
            </div>

            {/* Row 3 — Recent transactions (60%) + Insights (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <RecentTransactions transactions={recentTxns} loading={loadingRecent} />
                </div>
                <div className="lg:col-span-2">
                    <BehavioralInsight
                        summary={summary}
                        transactions={recentTxns}
                        loading={loadingSummary || loadingRecent}
                    />
                </div>
            </div>
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

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();

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
                    <NavButton
                        label="Budgets"
                        active={activeTab === "budgets"}
                        onClick={() => setActiveTab("budgets")}
                    />
                </nav>

                <div className="border-t border-border pt-6">
                    <div className="mb-4 text-sm text-text-secondary truncate">{user?.email}</div>
                    <button
                        onClick={toggleTheme}
                        className="bg-transparent border border-border text-text-secondary w-full p-2.5 rounded-sm cursor-pointer transition-all duration-200 hover:bg-bg-accent hover:text-text-primary mb-2 flex items-center justify-center gap-2"
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? "☀ Light mode" : "🌙 Dark mode"}
                    </button>
                    <button
                        onClick={logout}
                        className="bg-transparent border border-border text-text-secondary w-full p-2.5 rounded-sm cursor-pointer transition-all duration-200 hover:bg-bg-accent hover:text-text-primary"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-[260px] flex-1 flex flex-col">
                <header className="h-[70px] border-b border-border flex justify-end items-center px-8 bg-bg-secondary backdrop-blur-md sticky top-0 z-10">
                    <span className="text-sm text-text-secondary capitalize">{activeTab}</span>
                </header>

                <div className="p-8 flex-1">
                    {activeTab === "overview" && <Overview />}
                    {activeTab === "transactions" && <Transactions />}
                    {activeTab === "budgets" && <Budgets />}
                </div>
            </main>
        </div>
    );
}
