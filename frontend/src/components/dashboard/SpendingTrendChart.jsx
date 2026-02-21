import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

const tooltipStyle = {
    backgroundColor: "var(--bg-secondary)",
    borderColor: "var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "13px",
};

/** Receives pre-computed data from GET /insights/trend as [{month, spending}]. */
export default function SpendingTrendChart({ data = [], loading }) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {loading ? (
                    <div className="h-56 bg-bg-tertiary rounded animate-pulse" />
                ) : data.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-text-secondary text-sm">
                        No transaction data yet
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: "#8B92A8", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: "#8B92A8", fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `$${v}`}
                                width={56}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={{ color: "var(--text-primary)" }}
                                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Spending"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="spending"
                                stroke="#6366F1"
                                strokeWidth={2.5}
                                dot={{ fill: "#6366F1", r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
