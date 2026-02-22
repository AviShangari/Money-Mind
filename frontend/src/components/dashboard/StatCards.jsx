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

export default function StatCards({ summary, loading, budgetsStatus, loadingBudgets }) {
    // net_cash_flow is null when the month has no chequing data (CC-only)
    const netCashFlow = summary?.net_cash_flow != null ? Number(summary.net_cash_flow) : null;
    const totalSpending = summary ? Number(summary.total_spending) : 0;
    const txnCount = summary?.transaction_count ?? 0;
    const pctChange = summary?.previous_month_comparison ?? null;

    const topCategory = summary
        ? (Object.entries(summary.spending_by_category)
            .sort(([, a], [, b]) => Number(b) - Number(a))[0]?.[0] ?? "—")
        : "—";

    const pctLabel = pctChange != null
        ? `${pctChange >= 0 ? "↑" : "↓"} ${Math.abs(pctChange).toFixed(1)}% vs last month`
        : "No prior month data";

    const hasChequing = netCashFlow !== null;
    const isOnTrack = !loading && hasChequing && netCashFlow >= 0;

    let budgetHealthTitle = "Budget Health";
    let budgetHealthValue = "No budgets set";
    let budgetHealthSub = "Create limits to track spending";
    let budgetHealthClass = "text-text-secondary";

    if (!loadingBudgets && budgetsStatus && budgetsStatus.length > 0) {
        const totalBudgets = budgetsStatus.length;
        const onTrackCount = budgetsStatus.filter(b => !b.over_budget).length;

        budgetHealthValue = `${onTrackCount} of ${totalBudgets} on track`;
        budgetHealthSub = "Based on monthly limits";

        if (onTrackCount === totalBudgets) {
            budgetHealthClass = "text-success";
        } else if (onTrackCount > 0) {
            budgetHealthClass = "text-warning";
        } else {
            budgetHealthClass = "text-danger";
        }
    } else if (loadingBudgets) {
        // Fallback for while loading, handled by Skeleton anyway
        budgetHealthValue = "Loading...";
    }

    const cards = [
        {
            title: "Net Cash Flow",
            value: summary
                ? (hasChequing ? fmt(netCashFlow) : "N/A")
                : null,
            sub: summary
                ? (hasChequing
                    ? (netCashFlow >= 0 ? "Positive this period" : "Spending exceeds income")
                    : "Upload a chequing statement for cash flow")
                : null,
            valueClass: hasChequing
                ? (isOnTrack ? "text-success" : "text-danger")
                : "text-text-secondary",
        },
        {
            title: "Total Spending",
            value: summary ? fmt(totalSpending) : null,
            sub: summary ? `${txnCount} transaction${txnCount !== 1 ? "s" : ""} this month` : null,
            valueClass: "text-text-primary",
        },
        {
            title: "Top Category",
            value: summary ? topCategory : null,
            sub: summary ? "Highest spend this month" : null,
            valueClass: "text-brand",
        },
        {
            title: budgetHealthTitle,
            value: budgetHealthValue,
            sub: budgetHealthSub,
            valueClass: budgetHealthClass,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <Card key={card.title}>
                    <CardHeader>
                        <CardTitle>{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(loading || (card.title === "Budget Health" && loadingBudgets)) ? (
                            <Skeleton />
                        ) : (
                            <>
                                <p className={`text-2xl font-bold truncate ${card.valueClass}`}>
                                    {card.value}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">{card.sub}</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
