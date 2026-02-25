import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import api from "../api/axiosClient";

const COLORS = ["#6366F1", "#34D399", "#FBBF24", "#F87171", "#60A5FA", "#A78BFA", "#FB923C"];
const MAX_SLICES = 6;

const tooltipStyle = {
    backgroundColor: "var(--bg-secondary)",
    borderColor: "var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "13px",
};

/** Convert {category: amount} dict → [{name, value}] sorted desc, with "Other" bucket. */
function buildChartData(spendingByCategory) {
    const entries = Object.entries(spendingByCategory)
        .map(([name, value]) => [name, Number(value)])
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);

    const top = entries.slice(0, MAX_SLICES);
    const rest = entries.slice(MAX_SLICES);

    if (rest.length > 0) {
        const otherTotal = rest.reduce((s, [, v]) => s + v, 0);
        top.push(["Other", otherTotal]);
    }

    return top.map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

function MiniBarChart({ data, loading }) {
    if (loading) {
        return <div className="h-48 bg-bg-tertiary rounded animate-pulse" />;
    }
    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-text-secondary text-xs">
                No spending data
            </div>
        );
    }
    return (
        <ResponsiveContainer width="100%" height={192}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 9, fill: "var(--text-secondary)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.length > 11 ? v.slice(0, 10) + "…" : v}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "var(--text-primary)" }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`]}
                    cursor={{ fill: "var(--bg-tertiary)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

function LargePieChart({ data, loading }) {
    if (loading) {
        return <div className="h-72 bg-bg-tertiary rounded animate-pulse" />;
    }
    if (!data || data.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-text-secondary text-sm">
                No transaction data yet
            </div>
        );
    }
    return (
        <ResponsiveContainer width="100%" height={288}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                >
                    {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "var(--text-primary)" }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`]}
                />
                <Legend
                    iconType="circle"
                    iconSize={9}
                    wrapperStyle={{ fontSize: "13px", color: "var(--text-secondary)" }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

export default function Statistics() {
    const [breakdown, setBreakdown] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get("/insights/category-breakdown")
            .then((res) => setBreakdown(res.data))
            .catch(() => setError("Failed to load statistics."))
            .finally(() => setLoading(false));
    }, []);

    const averageData = breakdown
        ? buildChartData(breakdown.average_by_category)
        : [];

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-2xl font-bold text-text-primary">Statistics</h1>
                <p className="text-sm text-text-secondary mt-1">
                    Spending by category across all your statements
                </p>
            </div>

            {error && (
                <div className="text-danger text-sm">{error}</div>
            )}

            {/* ── Overall average chart ─────────────────────────────────── */}
            <div className="flex flex-col items-center">
                <div className="w-full max-w-md">
                    <div className="bg-bg-secondary border border-border rounded-lg p-6">
                        <h2 className="text-base font-semibold text-text-primary text-center mb-1">
                            Average Monthly Spending
                        </h2>
                        <p className="text-xs text-text-secondary text-center mb-4">
                            {breakdown && breakdown.months.length > 0
                                ? `Averaged across ${breakdown.months.length} month${breakdown.months.length === 1 ? "" : "s"}`
                                : "All time"}
                        </p>
                        <LargePieChart data={averageData} loading={loading} />
                    </div>
                </div>
            </div>

            {/* ── Per-month charts grid ─────────────────────────────────── */}
            {!loading && breakdown && breakdown.months.length > 0 && (
                <div>
                    <h2 className="text-base font-semibold text-text-primary mb-4">
                        Month by Month
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {breakdown.months.map((entry) => (
                            <div
                                key={entry.month}
                                className="bg-bg-secondary border border-border rounded-lg p-4"
                            >
                                <p className="text-sm font-semibold text-text-primary text-center mb-1">
                                    {entry.label}
                                </p>
                                <MiniBarChart
                                    data={buildChartData(entry.spending_by_category)}
                                    loading={false}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && breakdown && breakdown.months.length === 0 && (
                <div className="text-center text-text-secondary text-sm py-16">
                    No transactions yet. Upload a statement to see your spending breakdown.
                </div>
            )}
        </div>
    );
}
