import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

const fmt = (n) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Math.abs(n));

function CategoryBadge({ category }) {
    return (
        <span className="inline-block bg-brand-subtle text-brand text-xs font-medium px-2 py-0.5 rounded">
            {category || "Uncategorized"}
        </span>
    );
}

function SkeletonRow() {
    return (
        <tr>
            <td colSpan={4} className="px-4 py-3">
                <div className="h-4 bg-bg-tertiary rounded animate-pulse w-full" />
            </td>
        </tr>
    );
}

export default function RecentTransactions({ transactions, loading }) {
    // Caller already limits to 10; guard here in case the prop ever carries more
    const recent = transactions.slice(0, 10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-text-secondary">
                            <th className="text-left px-6 py-3 font-medium">Date</th>
                            <th className="text-left px-6 py-3 font-medium">Description</th>
                            <th className="text-left px-6 py-3 font-medium">Category</th>
                            <th className="text-right px-6 py-3 font-medium">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                        ) : recent.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-text-secondary">
                                    No transactions yet — upload a statement to get started.
                                </td>
                            </tr>
                        ) : (
                            recent.map((t) => {
                                const amount = Number(t.amount);
                                const isDebit = amount < 0;
                                return (
                                    <tr
                                        key={t.id}
                                        className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors"
                                    >
                                        <td className="px-6 py-3 text-text-secondary whitespace-nowrap">
                                            {t.date}
                                        </td>
                                        <td className="px-6 py-3 text-text-primary max-w-[180px] truncate">
                                            {t.description}
                                        </td>
                                        <td className="px-6 py-3">
                                            <CategoryBadge category={t.category} />
                                        </td>
                                        <td
                                            className={`px-6 py-3 text-right font-semibold tabular-nums ${
                                                isDebit ? "text-text-primary" : "text-success"
                                            }`}
                                        >
                                            {isDebit ? "−" : "+"}
                                            {fmt(amount)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
