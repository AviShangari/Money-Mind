import { useEffect, useState } from "react";
import api from "../api/axiosClient";
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

export default function Overview() {
    // Independent loading states so each section can skeleton independently
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [recentTxns, setRecentTxns] = useState([]);
    const [budgetsStatus, setBudgetsStatus] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingTrend, setLoadingTrend] = useState(true);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [loadingBudgets, setLoadingBudgets] = useState(true);

    useEffect(() => {
        // Fire all requests in parallel
        api.get("/insights/summary")
            .then((res) => setSummary(res.data))
            .catch((err) => {
                console.error("Failed to load summary:", err.message);
                setSummary(null);
            })
            .finally(() => setLoadingSummary(false));

        api.get("/insights/trend")
            .then((res) => setTrend(res.data?.trend ?? []))
            .catch((err) => {
                console.error("Failed to load trend:", err.message);
                setTrend([]);
            })
            .finally(() => setLoadingTrend(false));

        api.get("/transactions")
            .then((res) => setRecentTxns(res.data.slice(0, 10)))
            .catch((err) => {
                console.error("Failed to load transactions:", err.message);
                setRecentTxns([]);
            })
            .finally(() => setLoadingRecent(false));

        api.get("/budgets/status")
            .then((res) => setBudgetsStatus(res.data))
            .catch((err) => {
                console.error("Failed to load budgets:", err.message);
                setBudgetsStatus(null);
            })
            .finally(() => setLoadingBudgets(false));
    }, []);

    const categoryChartData = summary
        ? buildCategoryChartData(summary.spending_by_category)
        : [];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Overview</h1>
                <p className="text-text-secondary text-sm">Here's what's happening with your money.</p>
            </div>

            {/* Row 1 — 4 stat cards */}
            <StatCards
                summary={summary}
                loading={loadingSummary}
                budgetsStatus={budgetsStatus}
                loadingBudgets={loadingBudgets}
            />

            {/* Row 2 — Trend chart 60% + Donut 40% */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <SpendingTrendChart data={trend} loading={loadingTrend} />
                </div>
                <div className="lg:col-span-2">
                    <CategoryDonutChart data={categoryChartData} loading={loadingSummary} />
                </div>
            </div>

            {/* Row 3 — Recent transactions 60% + Insights 40% */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                    <RecentTransactions transactions={recentTxns} loading={loadingRecent} />
                </div>
                <div className="lg:col-span-2">
                    <BehavioralInsight
                        summary={summary}
                        loading={loadingSummary}
                    />
                </div>
            </div>
        </div>
    );
}
