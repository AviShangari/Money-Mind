import { Link } from "react-router-dom";
import { Pencil, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

const fmt = (n) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

function Skeleton() {
    return (
        <>
            <div className="h-8 w-28 bg-bg-tertiary rounded animate-pulse mt-1" />
            <div className="h-3 w-36 bg-bg-tertiary rounded animate-pulse mt-2" />
        </>
    );
}

function InfoTooltip({ text }) {
    return (
        <span className="relative group inline-flex items-center ml-1.5 align-middle cursor-help">
            <Info size={13} className="text-text-secondary" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 text-xs bg-bg-tertiary border border-border rounded-md px-2.5 py-2 text-text-secondary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 leading-relaxed text-center shadow-lg">
                {text}
            </span>
        </span>
    );
}

export default function StatCards({ summary, loading, onEditIncome, debtSummary, loadingDebt }) {
    // ── Raw values ────────────────────────────────────────────────────────────
    const netCashFlow      = summary?.net_cash_flow       != null ? Number(summary.net_cash_flow)           : null;
    const prevNetCashFlow  = summary?.previous_net_cash_flow != null ? Number(summary.previous_net_cash_flow) : null;
    const isEstimated      = summary?.cash_flow_estimated === true;
    const totalSpending    = summary ? Number(summary.total_spending)    : null;
    const ccSpending       = summary ? Number(summary.cc_spending   ?? 0) : null;
    const chequingSpending = summary ? Number(summary.chequing_spending ?? 0) : null;
    const transactionIncome = summary ? Number(summary.transaction_income ?? 0) : 0;
    const manualBase       = summary?.base_income != null ? Number(summary.base_income) : null;
    const manualSide       = summary?.side_income != null ? Number(summary.side_income) : null;
    const manualTotal      = (manualBase ?? 0) + (manualSide ?? 0);
    const totalIncome      = summary?.total_income != null ? Number(summary.total_income) : null;
    const pctChange        = summary?.previous_month_comparison ?? null;

    // ── Cash flow delta vs last month ─────────────────────────────────────────
    const cashFlowDelta =
        netCashFlow !== null && prevNetCashFlow !== null
            ? netCashFlow - prevNetCashFlow
            : null;

    // ── Total Income subtitle ─────────────────────────────────────────────────
    let incomeSub = null;
    if (summary) {
        if (manualTotal > 0 && transactionIncome > 0)
            incomeSub = "Manual income + chequing deposits";
        else if (manualTotal > 0)
            incomeSub = "Manual income (salary + side)";
        else if (transactionIncome > 0)
            incomeSub = "From chequing deposits";
        else
            incomeSub = "No income sources found";
    }

    // ── Net Cash Flow display ─────────────────────────────────────────────────
    let cashFlowClass = "text-text-secondary";
    let cashFlowSub   = null;
    if (summary) {
        if (netCashFlow === null) {
            cashFlowSub = "Set income in Settings or upload a chequing statement";
        } else {
            cashFlowClass = isEstimated
                ? (netCashFlow >= 0 ? "text-warning" : "text-danger")
                : (netCashFlow >= 0 ? "text-success" : "text-danger");
            if (cashFlowDelta !== null) {
                cashFlowSub = cashFlowDelta >= 0
                    ? `↑ ${fmt(Math.abs(cashFlowDelta))} more than last month`
                    : `↓ ${fmt(Math.abs(cashFlowDelta))} less than last month`;
            } else {
                cashFlowSub = netCashFlow >= 0 ? "Positive this period" : "Spending exceeds income";
            }
        }
    }

    // ── Total Spending subtitle ───────────────────────────────────────────────
    let spendingSub      = null;
    let spendingSubClass = "text-text-secondary";
    if (summary) {
        if (pctChange === null) {
            spendingSub = "No prior month data";
        } else if (pctChange > 0) {
            spendingSub      = `↑ ${pctChange.toFixed(1)}% vs last month`;
            spendingSubClass = "text-danger";
        } else if (pctChange < 0) {
            spendingSub      = `↓ ${Math.abs(pctChange).toFixed(1)}% vs last month`;
            spendingSubClass = "text-success";
        } else {
            spendingSub = "Same as last month";
        }
    }

    return (
        <div className="space-y-4">

            {/* ── Row 1: Income & Cash Flow ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Base Income */}
                <Card>
                    <CardHeader><CardTitle>Base Income</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className={`text-2xl font-bold truncate ${manualBase != null ? "text-text-primary" : "text-text-secondary"}`}>
                                    {manualBase != null ? fmt(manualBase) : "Not set"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {manualBase != null
                                        ? "Monthly salary / wages"
                                        : <Link to="/dashboard/settings" className="text-brand hover:underline">Add in Settings →</Link>}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Side Income */}
                <Card>
                    <CardHeader><CardTitle>Side Income</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className={`text-2xl font-bold truncate ${manualSide != null ? "text-text-primary" : "text-text-secondary"}`}>
                                    {manualSide != null ? fmt(manualSide) : "Not set"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {manualSide != null
                                        ? "Monthly side income"
                                        : <Link to="/dashboard/settings" className="text-brand hover:underline">Add in Settings →</Link>}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Total Income */}
                <Card>
                    <CardHeader><CardTitle>Total Income</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className={`text-2xl font-bold truncate ${totalIncome != null ? "text-text-primary" : "text-text-secondary"}`}>
                                    {totalIncome != null ? fmt(totalIncome) : "N/A"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {incomeSub ?? "Upload a statement or set income"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Net Cash Flow */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Net Cash Flow</CardTitle>
                            {onEditIncome && (
                                <button
                                    onClick={onEditIncome}
                                    className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded"
                                    title="Edit monthly income"
                                >
                                    <Pencil size={13} />
                                </button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className={`text-2xl font-bold truncate ${cashFlowClass}`}>
                                    {netCashFlow !== null ? fmt(netCashFlow) : "N/A"}
                                    {isEstimated && netCashFlow !== null && (
                                        <InfoTooltip text="Includes your manual income setting. Upload a chequing statement for actual figures." />
                                    )}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">{cashFlowSub}</p>
                            </>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* ── Row 2: Spending & Debt ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Total Spending */}
                <Card>
                    <CardHeader><CardTitle>Total Spending</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className="text-2xl font-bold truncate text-danger">
                                    {totalSpending != null ? fmt(totalSpending) : "N/A"}
                                </p>
                                <p className={`text-xs mt-1 ${summary ? spendingSubClass : "text-text-secondary"}`}>
                                    {summary ? spendingSub : "Upload a bank statement"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Credit Card Spending */}
                <Card>
                    <CardHeader><CardTitle>Credit Card</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className="text-2xl font-bold truncate text-text-primary">
                                    {ccSpending != null ? fmt(ccSpending) : "N/A"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {summary ? "CC purchases this month" : "Upload a CC statement"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Bank Account Spending */}
                <Card>
                    <CardHeader><CardTitle>Bank Account</CardTitle></CardHeader>
                    <CardContent>
                        {loading ? <Skeleton /> : (
                            <>
                                <p className="text-2xl font-bold truncate text-text-primary">
                                    {chequingSpending != null ? fmt(chequingSpending) : "N/A"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {summary ? "Chequing purchases this month" : "Upload a chequing statement"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Total Debt */}
                <Card>
                    <CardHeader><CardTitle>Total Debt</CardTitle></CardHeader>
                    <CardContent>
                        {loadingDebt ? <Skeleton /> : (
                            <>
                                <p className={`text-2xl font-bold truncate ${debtSummary?.debt_count > 0 ? "text-danger" : "text-text-secondary"}`}>
                                    {debtSummary?.debt_count > 0 ? fmt(debtSummary.total_debt) : "No debts tracked"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {debtSummary?.debt_count > 0
                                        ? `${debtSummary.debt_count} debt${debtSummary.debt_count !== 1 ? "s" : ""} tracked`
                                        : <Link to="/dashboard/debt" className="text-brand hover:underline">Set up on the Debt page →</Link>
                                    }
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
