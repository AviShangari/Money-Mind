import { useEffect, useState, useCallback } from "react";
import { AlertCircle, X } from "lucide-react";
import api from "../api/axiosClient";
import StatCards from "../components/dashboard/StatCards";
import SpendingTrendChart from "../components/dashboard/SpendingTrendChart";
import CategoryDonutChart from "../components/dashboard/CategoryDonutChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import BehavioralInsight from "../components/dashboard/BehavioralInsight";
import IncomeModal from "../components/dashboard/IncomeModal";

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

/** Human-readable label for days_until_due. */
function dueSoonLabel(daysUntil) {
    if (daysUntil < 0) {
        const d = Math.abs(daysUntil);
        return d === 1 ? "was due yesterday" : `was due ${d} days ago`;
    }
    if (daysUntil === 0) return "is due today";
    if (daysUntil === 1) return "is due tomorrow";
    return `is due in ${daysUntil} days`;
}

export default function Overview() {
    // Independent loading states so each section can skeleton independently
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [recentTxns, setRecentTxns] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingTrend, setLoadingTrend] = useState(true);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [debtSummary, setDebtSummary] = useState(null);
    const [loadingDebt, setLoadingDebt] = useState(true);
    const [incomeModalOpen, setIncomeModalOpen] = useState(false);

    // Due-soon debt notifications
    const [dueSoon, setDueSoon] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());

    // Payment dialog state
    const [payDebt, setPayDebt] = useState(null);
    const [payAmount, setPayAmount] = useState("");
    const [payingSaving, setPayingSaving] = useState(false);
    const [payError, setPayError] = useState("");

    const fetchSummary = useCallback(() => {
        setLoadingSummary(true);
        api.get("/insights/summary")
            .then((res) => setSummary(res.data))
            .catch((err) => {
                console.error("Failed to load summary:", err.message);
                setSummary(null);
            })
            .finally(() => setLoadingSummary(false));
    }, []);

    useEffect(() => {
        // Fire all requests in parallel
        fetchSummary();

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

        api.get("/debts/summary")
            .then((res) => setDebtSummary(res.data))
            .catch(() => setDebtSummary(null))
            .finally(() => setLoadingDebt(false));

        api.get("/debts/due-soon")
            .then((res) => setDueSoon(res.data ?? []))
            .catch(() => setDueSoon([]));

    }, [fetchSummary]);

    const handleDismiss = (id) => {
        setDismissed((prev) => new Set([...prev, id]));
    };

    const openPayDialog = (debt) => {
        setPayDebt(debt);
        setPayAmount(String(debt.minimum_payment));
        setPayError("");
    };

    const closePayDialog = () => {
        setPayDebt(null);
        setPayAmount("");
        setPayError("");
    };

    const handlePay = async () => {
        if (!payDebt || !payAmount || Number(payAmount) <= 0) return;
        setPayingSaving(true);
        setPayError("");
        try {
            await api.post(`/debts/${payDebt.id}/payment`, { amount: Number(payAmount) });
            setDueSoon((prev) => prev.filter((d) => d.id !== payDebt.id));
            closePayDialog();
            fetchSummary();
            api.get("/debts/summary")
                .then((res) => setDebtSummary(res.data))
                .catch(() => {});
        } catch (err) {
            setPayError(err.response?.data?.detail ?? "Payment failed. Please try again.");
        } finally {
            setPayingSaving(false);
        }
    };

    const categoryChartData = summary
        ? buildCategoryChartData(summary.spending_by_category)
        : [];

    const visibleNotifications = dueSoon.filter((d) => !dismissed.has(d.id));

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Overview</h1>
                <p className="text-text-secondary text-sm">Here's what's happening with your money.</p>
            </div>

            {/* Debt payment notifications */}
            {visibleNotifications.length > 0 && (
                <div className="space-y-2">
                    {visibleNotifications.map((debt) => {
                        const isOverdue = debt.days_until_due < 0;
                        return (
                            <div
                                key={debt.id}
                                className={`flex items-center justify-between gap-4 px-4 py-3 rounded-md border ${
                                    isOverdue
                                        ? "bg-danger/10 border-danger/30 text-danger"
                                        : "bg-warning/10 border-warning/30 text-warning"
                                }`}
                            >
                                <div className="flex items-center gap-2 text-sm min-w-0">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    <span className="truncate">
                                        <span className="font-semibold">{debt.name}</span>
                                        {" payment of "}
                                        <span className="font-semibold">
                                            ${Number(debt.minimum_payment).toFixed(2)}
                                        </span>
                                        {" "}
                                        {dueSoonLabel(debt.days_until_due)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => openPayDialog(debt)}
                                        className="text-xs px-2.5 py-1.5 rounded border border-current font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
                                    >
                                        I've paid it
                                    </button>
                                    <button
                                        onClick={() => handleDismiss(debt.id)}
                                        aria-label="Dismiss"
                                        className="p-1.5 hover:opacity-60 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Row 1 — 4 stat cards */}
            <StatCards
                summary={summary}
                loading={loadingSummary}
                onEditIncome={() => setIncomeModalOpen(true)}
                debtSummary={debtSummary}
                loadingDebt={loadingDebt}
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

            <IncomeModal
                open={incomeModalOpen}
                onClose={() => setIncomeModalOpen(false)}
                onSaved={fetchSummary}
            />

            {/* Payment dialog */}
            {payDebt && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={(e) => { if (e.target === e.currentTarget) closePayDialog(); }}
                >
                    <div className="bg-bg-secondary rounded-md p-6 w-full max-w-sm mx-4 space-y-4 border border-border">
                        <h3 className="font-semibold text-text-primary text-base">
                            Record Payment — {payDebt.name}
                        </h3>

                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">
                                How much did you pay?
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-full border border-border rounded-sm pl-7 pr-3 py-2 text-sm bg-bg-primary text-text-primary focus:outline-none focus:border-brand"
                                    min="0.01"
                                    step="0.01"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {payAmount && Number(payAmount) > 0 && (
                            <p className="text-xs text-text-secondary">
                                New balance:{" "}
                                <span className="font-medium text-text-primary">
                                    ${Math.max(0, Number(payDebt.balance) - Number(payAmount)).toFixed(2)}
                                </span>
                            </p>
                        )}

                        {payError && (
                            <p className="text-xs text-danger">{payError}</p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={closePayDialog}
                                className="flex-1 border border-border text-sm py-2 rounded-sm text-text-secondary hover:bg-bg-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePay}
                                disabled={payingSaving || !payAmount || Number(payAmount) <= 0}
                                className="flex-1 bg-brand text-white text-sm py-2 rounded-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {payingSaving ? "Saving…" : "Confirm Payment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
