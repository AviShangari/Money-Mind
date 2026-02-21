import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

const COLORS = ["#6366F1", "#34D399", "#FBBF24", "#F87171", "#60A5FA", "#A78BFA", "#FB923C"];

const tooltipStyle = {
    backgroundColor: "var(--bg-secondary)",
    borderColor: "var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "13px",
};

/** Receives pre-computed data from Dashboard as [{name, value}] (already sliced + "Other" added). */
export default function CategoryDonutChart({ data = [], loading }) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
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
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={80}
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
                                iconSize={8}
                                wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
