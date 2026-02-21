import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

/**
 * Build insight bullets from the pre-computed summary.
 *
 * Props:
 *   summary – response from GET /insights/summary (or null)
 */
function buildInsights(summary) {
    if (!summary || Number(summary.total_spending) === 0) {
        return [{ icon: "💡", text: "Upload your first bank statement to unlock spending insights." }];
    }

    const totalSpending = Number(summary.total_spending);
    const pctChange     = summary.previous_month_comparison;

    // Top category from the server-aggregated dict
    const catEntries = Object.entries(summary.spending_by_category)
        .map(([name, value]) => [name, Number(value)])
        .sort(([, a], [, b]) => b - a);
    const [topCat, topAmt] = catEntries[0] ?? ["—", 0];
    const topPct = totalSpending > 0 ? ((topAmt / totalSpending) * 100).toFixed(0) : 0;

    // Average spend per debit transaction (use spending_count, not total transaction_count)
    const spendingCount = summary.spending_count ?? 0;
    const avg = spendingCount > 0 ? totalSpending / spendingCount : 0;

    // Largest single expense from the full month (provided by the backend)
    const largest = summary.largest_expense ?? null;

    // Month-over-month trend from the server-computed percentage
    const trendInsight = pctChange != null
        ? pctChange >= 0
            ? `Spending is up ${Math.abs(pctChange).toFixed(0)}% vs last month.`
            : `Spending is down ${Math.abs(pctChange).toFixed(0)}% vs last month.`
        : null;

    return [
        {
            icon: "🏆",
            text: `${topCat} is your top category — ${topPct}% of total spending.`,
        },
        largest ? {
            icon: "💳",
            text: `Largest transaction: $${Math.abs(largest.amount).toFixed(2)} — ${largest.description}.`,
        } : null,
        {
            icon: "📊",
            text: `Average transaction size: $${avg.toFixed(2)}.`,
        },
        trendInsight ? {
            icon: pctChange >= 0 ? "📈" : "📉",
            text: trendInsight,
        } : null,
    ].filter(Boolean);
}

export default function BehavioralInsight({ summary, loading }) {
    const insights = loading ? [] : buildInsights(summary);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Spending Insights</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {insights.map((insight, i) => (
                            <li key={i} className="flex gap-3 items-start text-sm">
                                <span className="text-base leading-tight">{insight.icon}</span>
                                <span className="text-text-secondary leading-snug">{insight.text}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
