import { useState, useEffect, useMemo, useCallback } from "react";
import { CreditCard, Plus, Edit2, Trash2, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import api from "../api/axiosClient";

// ── Constants ──────────────────────────────────────────────────────────────────

const DEBT_TYPES = [
    { value: "credit_card",    label: "Credit Card"    },
    { value: "loan",           label: "Loan"           },
    { value: "line_of_credit", label: "Line of Credit" },
    { value: "mortgage",       label: "Mortgage"       },
    { value: "student_loan",   label: "Student Loan"   },
    { value: "other",          label: "Other"          },
];

const TYPE_LABEL = Object.fromEntries(DEBT_TYPES.map(t => [t.value, t.label]));

const TYPE_BADGE = {
    credit_card:    "bg-brand/15 text-brand",
    loan:           "bg-success/15 text-success",
    line_of_credit: "bg-warning/15 text-warning",
    mortgage:       "bg-purple-500/15 text-purple-400",
    student_loan:   "bg-cyan-500/15 text-cyan-400",
    other:          "bg-bg-tertiary text-text-secondary",
};

const LINE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

const STRATEGY_INFO = {
    avalanche: "Highest interest rate first — minimises total interest paid",
    snowball:  "Lowest balance first — builds momentum with quick wins",
};

// ── Formatters ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n ?? 0);

function fmtShort(n) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
    return `$${Math.round(n)}`;
}

function fmtYearMonth(ym) {
    if (!ym) return null;
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-CA", {
        month: "short", year: "numeric",
    });
}

function fmtXTick(ym) {
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-CA", {
        month: "short", year: "2-digit",
    });
}

function fmtDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-CA", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function sampleArr(arr, maxPoints = 48) {
    if (!arr || arr.length <= maxPoints) return arr ?? [];
    const step = Math.ceil(arr.length / maxPoints);
    return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <>
            <div className="h-8 w-28 bg-bg-tertiary rounded animate-pulse mt-1" />
            <div className="h-3 w-36 bg-bg-tertiary rounded animate-pulse mt-2" />
        </>
    );
}

function SummaryCard({ label, value, sub, loading, valueClass = "text-text-primary" }) {
    return (
        <Card>
            <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
            <CardContent>
                {loading ? <Skeleton /> : (
                    <>
                        <p className={`text-2xl font-bold truncate ${valueClass}`}>{value}</p>
                        {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function DebtCard({ debt, onEdit, onDelete, onPay, expanded, onToggle, payoffDetail, payoffLoading }) {
    // ── Balance freshness ─────────────────────────────────────────────────────
    const sv  = debt.last_verified_at;
    const mu  = debt.last_manual_update_at;

    let freshnessText;
    if (sv && mu) {
        const useSv = new Date(sv) >= new Date(mu);
        freshnessText = useSv
            ? `Verified from statement: ${fmtDate(sv)}`
            : `Last manually updated: ${fmtDate(mu)}`;
    } else if (sv) {
        freshnessText = `Verified from statement: ${fmtDate(sv)}`;
    } else if (mu) {
        freshnessText = `Last manually updated: ${fmtDate(mu)}`;
    } else {
        freshnessText = "Balance not yet verified";
    }

    // ── Per-debt balance chart data ───────────────────────────────────────────
    const debtChartData = useMemo(() => {
        if (!payoffDetail?.monthly_balances) return [];
        return sampleArr(
            payoffDetail.monthly_balances.map(p => ({
                date:    p.date,
                balance: Number(p.balance),
            }))
        );
    }, [payoffDetail]);

    return (
        <Card
            className={`transition-all cursor-pointer ${expanded ? "border-brand/40 shadow-sm" : "hover:border-brand/30"} group flex flex-col`}
            onClick={onToggle}
        >
            <CardContent className="p-5 flex flex-col flex-1">
                {/* ── Header row ─────────────────────────────────────────────── */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary text-base truncate pr-2">
                            {debt.name}
                        </h3>
                        <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[debt.debt_type] ?? TYPE_BADGE.other}`}>
                            {TYPE_LABEL[debt.debt_type] ?? debt.debt_type}
                        </span>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                            onClick={e => { e.stopPropagation(); onEdit(debt); }}
                            className="p-1.5 text-text-secondary hover:text-brand hover:bg-bg-tertiary rounded-sm transition-colors"
                            title="Edit debt"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(debt); }}
                            className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                            title="Delete debt"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* ── Balance ───────────────────────────────────────────────── */}
                <p className="text-3xl font-bold text-text-primary mb-3">
                    {fmt(debt.balance)}
                </p>

                {/* ── Stats row ─────────────────────────────────────────────── */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary border-t border-border/50 pt-3">
                    <span>
                        <span className="font-medium text-text-primary">
                            {Number(debt.interest_rate).toFixed(2)}%
                        </span>{" "}APR
                    </span>
                    <span>
                        <span className="font-medium text-text-primary">
                            {fmt(debt.minimum_payment)}
                        </span>{" "}min/mo
                    </span>
                    {debt.due_date && (
                        <span>Due {ordinal(debt.due_date)}</span>
                    )}
                </div>

                {/* ── Freshness ─────────────────────────────────────────────── */}
                <p className={`text-xs mt-2 ${
                    sv || mu ? "text-text-secondary" : "text-text-secondary/60 italic"
                }`}>
                    {freshnessText}
                </p>

                {/* ── Expand hint ───────────────────────────────────────────── */}
                <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary/50">
                    {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    <span>{expanded ? "Hide payoff plan" : "View payoff plan"}</span>
                </div>

                {/* ── Record Payment button ─────────────────────────────────── */}
                <div className="mt-3 pt-3 border-t border-border/50">
                    <button
                        onClick={e => { e.stopPropagation(); onPay(debt); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand/80 transition-colors"
                    >
                        <DollarSign size={13} />
                        Record Payment
                    </button>
                </div>

                {/* ── Expanded payoff plan ──────────────────────────────────── */}
                {expanded && (
                    <div
                        className="mt-4 pt-4 border-t border-border/40 space-y-3"
                        onClick={e => e.stopPropagation()}
                    >
                        {payoffLoading ? (
                            <div className="h-32 bg-bg-tertiary rounded-sm animate-pulse" />
                        ) : payoffDetail ? (
                            <>
                                {/* 4-stat grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-bg-tertiary rounded-sm p-2.5">
                                        <p className="text-[10px] text-text-secondary mb-0.5">Payoff date</p>
                                        <p className="text-sm font-semibold text-success">
                                            {payoffDetail.payoff_date ? fmtYearMonth(payoffDetail.payoff_date) : "50+ yr"}
                                        </p>
                                    </div>
                                    <div className="bg-bg-tertiary rounded-sm p-2.5">
                                        <p className="text-[10px] text-text-secondary mb-0.5">Total interest</p>
                                        <p className="text-sm font-semibold text-danger">
                                            {fmt(payoffDetail.total_interest)}
                                        </p>
                                    </div>
                                    <div className="bg-bg-tertiary rounded-sm p-2.5">
                                        <p className="text-[10px] text-text-secondary mb-0.5">Months to pay off</p>
                                        <p className="text-sm font-semibold text-text-primary">
                                            {payoffDetail.months_to_payoff ?? "—"}
                                        </p>
                                    </div>
                                    <div className="bg-bg-tertiary rounded-sm p-2.5">
                                        <p className="text-[10px] text-text-secondary mb-0.5">Payoff order</p>
                                        <p className="text-sm font-semibold text-text-primary">
                                            #{payoffDetail.order ?? "—"}
                                        </p>
                                    </div>
                                </div>

                                {/* Balance decline chart */}
                                {debtChartData.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-text-secondary mb-1">Balance over time</p>
                                        <ResponsiveContainer width="100%" height={120}>
                                            <LineChart data={debtChartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={fmtXTick}
                                                    tick={{ fill: "#8B92A8", fontSize: 9 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    tick={{ fill: "#8B92A8", fontSize: 9 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={fmtShort}
                                                    width={42}
                                                />
                                                <Tooltip
                                                    contentStyle={tooltipStyle}
                                                    itemStyle={{ color: "var(--text-primary)" }}
                                                    formatter={(v) => [fmt(v), "Balance"]}
                                                    labelFormatter={fmtYearMonth}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="balance"
                                                    stroke="#6366F1"
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 3 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-xs text-text-secondary text-center py-4">
                                No payoff data — waiting for plan to load.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FormField({ label, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
            {children}
        </div>
    );
}

const INPUT_CLS =
    "w-full px-3 py-2 rounded-sm bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function CurrencyInput({ value, onChange, required }) {
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
            <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={onChange}
                placeholder="0.00"
                required={required}
                className={`${INPUT_CLS} pl-7`}
            />
        </div>
    );
}

const tooltipStyle = {
    backgroundColor: "var(--bg-secondary)",
    borderColor:     "var(--border)",
    borderRadius:    "8px",
    color:           "var(--text-primary)",
    fontSize:        "12px",
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function Debt() {
    // ── Data ───────────────────────────────────────────────────────────────────
    const [debts,         setDebts]         = useState([]);
    const [debtSummary,   setDebtSummary]   = useState(null);
    const [payoff,        setPayoff]        = useState(null);
    const [baseline,      setBaseline]      = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [loadingPayoff, setLoadingPayoff] = useState(false);

    // ── Available CC banks (for statement link dropdown) ───────────────────────
    const [ccBanks, setCcBanks] = useState([]);

    // ── Payoff controls ────────────────────────────────────────────────────────
    const [strategy,       setStrategy]       = useState("avalanche");
    const [extraPayment,   setExtraPayment]   = useState("");
    const [debouncedExtra, setDebouncedExtra] = useState(0);

    // ── Add / Edit modal ───────────────────────────────────────────────────────
    const [isModalOpen,    setIsModalOpen]    = useState(false);
    const [modalMode,      setModalMode]      = useState("create");
    const [selectedDebt,   setSelectedDebt]   = useState(null);
    const [formName,       setFormName]       = useState("");
    const [formType,       setFormType]       = useState("credit_card");
    const [formBalance,    setFormBalance]    = useState("");
    const [formRate,       setFormRate]       = useState("");
    const [formMinPay,     setFormMinPay]     = useState("");
    const [formDueDate,    setFormDueDate]    = useState("");
    const [formLinkedBank, setFormLinkedBank] = useState("");
    const [formError,      setFormError]      = useState("");
    const [saving,         setSaving]         = useState(false);

    // ── Expanded card ──────────────────────────────────────────────────────────
    const [expandedDebtId, setExpandedDebtId] = useState(null);

    // ── Delete confirm ─────────────────────────────────────────────────────────
    const [debtToDelete, setDebtToDelete] = useState(null);

    // ── Payment dialog ─────────────────────────────────────────────────────────
    const [paymentTarget,  setPaymentTarget]  = useState(null);
    const [paymentAmount,  setPaymentAmount]  = useState("");
    const [paymentSaving,  setPaymentSaving]  = useState(false);
    const [paymentError,   setPaymentError]   = useState("");

    // ── Fetch debts + summary ──────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [debtsRes, summaryRes] = await Promise.all([
                api.get("/debts"),
                api.get("/debts/summary"),
            ]);
            setDebts(debtsRes.data);
            setDebtSummary(summaryRes.data);
        } catch (e) {
            console.error("Failed to load debts", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Fetch available CC banks once on mount ─────────────────────────────────
    useEffect(() => {
        api.get("/transactions/cc-banks")
            .then(res => setCcBanks(res.data))
            .catch(() => {});
    }, []);

    // ── Debounce extra payment input ───────────────────────────────────────────
    useEffect(() => {
        const id = setTimeout(() => setDebouncedExtra(parseFloat(extraPayment) || 0), 600);
        return () => clearTimeout(id);
    }, [extraPayment]);

    // ── Fetch payoff plan whenever debts / strategy / extra change ─────────────
    useEffect(() => {
        if (debts.length === 0) {
            setPayoff(null);
            setBaseline(null);
            return;
        }
        const extra = debouncedExtra;
        setLoadingPayoff(true);
        const requests = [
            api.get(`/debts/payoff?strategy=${strategy}&extra_payment=${extra}`),
        ];
        if (extra > 0) {
            requests.push(api.get(`/debts/payoff?strategy=${strategy}&extra_payment=0`));
        }
        Promise.all(requests)
            .then(([payoffRes, baseRes]) => {
                setPayoff(payoffRes.data);
                setBaseline(baseRes?.data ?? null);
            })
            .catch(() => {})
            .finally(() => setLoadingPayoff(false));
    }, [debts, strategy, debouncedExtra]);

    // ── Modal helpers ──────────────────────────────────────────────────────────
    function openModal(mode, debt = null) {
        setModalMode(mode);
        setFormError("");
        if (mode === "edit" && debt) {
            setSelectedDebt(debt);
            setFormName(debt.name);
            setFormType(debt.debt_type);
            setFormBalance(String(debt.balance));
            setFormRate(String(debt.interest_rate));
            setFormMinPay(String(debt.minimum_payment));
            setFormDueDate(debt.due_date ? String(debt.due_date) : "");
            setFormLinkedBank(debt.linked_statement_bank ?? "");
        } else {
            setSelectedDebt(null);
            setFormName("");
            setFormType("credit_card");
            setFormBalance("");
            setFormRate("");
            setFormMinPay("");
            setFormDueDate("");
            setFormLinkedBank("");
        }
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setFormError("");
    }

    async function handleSave(e) {
        e.preventDefault();
        setFormError("");
        const balance = parseFloat(formBalance);
        const rate    = parseFloat(formRate);
        const minPay  = parseFloat(formMinPay);
        const dueDate = formDueDate ? parseInt(formDueDate) : null;

        if (!formName.trim())                              return setFormError("Name is required.");
        if (isNaN(balance) || balance < 0)                 return setFormError("Enter a valid balance.");
        if (isNaN(rate) || rate < 0 || rate > 100)         return setFormError("Interest rate must be between 0 and 100.");
        if (isNaN(minPay) || minPay < 0)                   return setFormError("Enter a valid minimum payment.");
        if (dueDate !== null && (dueDate < 1 || dueDate > 31)) return setFormError("Due date must be between 1 and 31.");

        const payload = {
            name:                  formName.trim(),
            debt_type:             formType,
            balance,
            interest_rate:         rate,
            minimum_payment:       minPay,
            due_date:              dueDate,
            linked_statement_bank: formLinkedBank || null,
        };

        setSaving(true);
        try {
            if (modalMode === "create") {
                await api.post("/debts", payload);
            } else {
                await api.put(`/debts/${selectedDebt.id}`, payload);
            }
            closeModal();
            await fetchData();
        } catch (err) {
            setFormError(err.response?.data?.detail || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!debtToDelete) return;
        try {
            await api.delete(`/debts/${debtToDelete.id}`);
            setDebtToDelete(null);
            await fetchData();
        } catch (e) {
            console.error("Failed to delete debt", e);
        }
    }

    // ── Payment dialog helpers ─────────────────────────────────────────────────
    function openPayment(debt) {
        setPaymentTarget(debt);
        setPaymentAmount(String(debt.minimum_payment));
        setPaymentError("");
    }

    function closePayment() {
        setPaymentTarget(null);
        setPaymentError("");
    }

    async function handlePayment(e) {
        e.preventDefault();
        setPaymentError("");
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            return setPaymentError("Enter a valid payment amount.");
        }
        setPaymentSaving(true);
        try {
            await api.post(`/debts/${paymentTarget.id}/payment`, { amount });
            closePayment();
            await fetchData();
        } catch (err) {
            setPaymentError(err.response?.data?.detail || "Failed to record payment.");
        } finally {
            setPaymentSaving(false);
        }
    }

    // ── Chart data transformation ──────────────────────────────────────────────
    const { chartData, debtNames } = useMemo(() => {
        if (!payoff?.monthly_projection?.length) return { chartData: [], debtNames: [] };
        const names = payoff.payoff_order.map(d => d.name);
        let raw = payoff.monthly_projection.map(p => {
            const entry = { date: p.date };
            names.forEach(name => { entry[name] = Number(p.breakdown[name] ?? 0); });
            return entry;
        });
        // Sample to ≤ 60 points for chart readability
        if (raw.length > 60) {
            const step = Math.ceil(raw.length / 60);
            raw = raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
        }
        return { chartData: raw, debtNames: names };
    }, [payoff]);

    // ── Savings vs minimum-only baseline ──────────────────────────────────────
    const interestSaved = baseline && payoff
        ? Number(baseline.total_interest_paid) - Number(payoff.total_interest_paid)
        : null;
    const monthsSaved = baseline && payoff && payoff.total_months && baseline.total_months
        ? baseline.total_months - payoff.total_months
        : null;

    // ── Derived summary values ─────────────────────────────────────────────────
    const totalDebt   = debtSummary ? Number(debtSummary.total_debt) : null;
    const totalMinPay = debtSummary ? Number(debtSummary.total_minimum_payments) : null;
    const avgRate     = debtSummary?.weighted_average_interest_rate != null
        ? Number(debtSummary.weighted_average_interest_rate) : null;
    const debtFreeAv  = debtSummary?.debt_free_date_avalanche ?? null;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Debt</h1>
                    <p className="text-text-secondary text-sm">
                        Track balances and plan your path to debt freedom.
                    </p>
                </div>
                <button
                    onClick={() => openModal("create")}
                    className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-sm font-medium hover:bg-brand/90 transition-colors self-start sm:self-auto"
                >
                    <Plus size={18} />
                    Add Debt
                </button>
            </div>

            {/* ── Summary cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total Debt"
                    value={totalDebt != null ? fmt(totalDebt) : "—"}
                    sub={
                        debtSummary?.debt_count > 0
                            ? `${debtSummary.debt_count} debt${debtSummary.debt_count !== 1 ? "s" : ""} tracked`
                            : "No debts added yet"
                    }
                    loading={loading}
                    valueClass={totalDebt ? "text-danger" : "text-text-secondary"}
                />
                <SummaryCard
                    label="Monthly Minimums"
                    value={totalMinPay != null ? fmt(totalMinPay) : "—"}
                    sub="Required monthly payments"
                    loading={loading}
                />
                <SummaryCard
                    label="Avg Interest Rate"
                    value={avgRate != null ? `${avgRate.toFixed(2)}%` : "—"}
                    sub="Weighted by balance"
                    loading={loading}
                    valueClass={
                        avgRate == null ? "text-text-secondary"
                        : avgRate > 15  ? "text-danger"
                        : avgRate > 8   ? "text-warning"
                        : "text-success"
                    }
                />
                <SummaryCard
                    label="Debt-Free Date"
                    value={debtFreeAv ? fmtYearMonth(debtFreeAv) : "—"}
                    sub={
                        debtFreeAv
                            ? `${debtSummary.avalanche_months} months (avalanche)`
                            : "Add debts to calculate"
                    }
                    loading={loading}
                    valueClass={debtFreeAv ? "text-success" : "text-text-secondary"}
                />
            </div>

            {/* ── Loading skeletons for debt list ───────────────────────────── */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="h-40 bg-bg-tertiary/40" />
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Empty state ───────────────────────────────────────────────── */}
            {!loading && debts.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center">
                            <CreditCard size={32} strokeWidth={1.5} className="text-text-secondary" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-text-primary text-lg mb-1">
                                No debts tracked yet
                            </p>
                            <p className="text-sm text-text-secondary max-w-sm mb-6">
                                Add your debts to get a personalised payoff plan, total interest
                                projections, and an estimated debt-free date using avalanche or snowball
                                strategies.
                            </p>
                            <button
                                onClick={() => openModal("create")}
                                className="bg-brand text-white px-5 py-2 rounded-sm font-medium hover:bg-brand/90 transition-colors"
                            >
                                Add Your First Debt
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Debt list + Payoff Plan ───────────────────────────────────── */}
            {!loading && debts.length > 0 && (
                <>
                    {/* Debt cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {debts.map(debt => (
                            <DebtCard
                                key={debt.id}
                                debt={debt}
                                onEdit={d => openModal("edit", d)}
                                onDelete={setDebtToDelete}
                                onPay={openPayment}
                                expanded={expandedDebtId === debt.id}
                                onToggle={() => setExpandedDebtId(prev => prev === debt.id ? null : debt.id)}
                                payoffDetail={payoff?.payoff_order.find(d => d.debt_id === debt.id) ?? null}
                                payoffLoading={loadingPayoff}
                            />
                        ))}
                    </div>

                    {/* ── Overall Payoff Plan card ──────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Overall Payoff Plan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">

                            {/* Controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Strategy toggle */}
                                <div className="flex bg-bg-tertiary border border-border rounded-sm p-0.5 w-fit">
                                    {["avalanche", "snowball"].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStrategy(s)}
                                            className={`px-4 py-1.5 rounded-sm text-sm font-medium capitalize transition-all ${
                                                strategy === s
                                                    ? "bg-brand text-white shadow-sm"
                                                    : "text-text-secondary hover:text-text-primary"
                                            }`}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {/* Extra monthly payment */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-text-secondary whitespace-nowrap">
                                        Extra monthly:
                                    </span>
                                    <div className="relative w-32">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={extraPayment}
                                            onChange={e => setExtraPayment(e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-7 pr-3 py-1.5 rounded-sm bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Strategy description */}
                            <p className="text-xs text-text-secondary -mt-1">
                                {STRATEGY_INFO[strategy]}
                            </p>

                            {/* Stats boxes */}
                            {loadingPayoff ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 bg-bg-tertiary rounded-sm animate-pulse" />
                                    ))}
                                </div>
                            ) : payoff && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                    {/* Debt-free date */}
                                    <div className="bg-bg-tertiary rounded-sm p-3">
                                        <p className="text-xs text-text-secondary mb-0.5">Debt-free date</p>
                                        <p className="font-semibold text-text-primary">
                                            {payoff.debt_free_date
                                                ? fmtYearMonth(payoff.debt_free_date)
                                                : "50+ years"}
                                        </p>
                                        {payoff.total_months != null && (
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                {payoff.total_months} months
                                                {monthsSaved > 0 && (
                                                    <span className="text-success ml-1.5">
                                                        ({monthsSaved} sooner)
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    {/* Total interest */}
                                    <div className="bg-bg-tertiary rounded-sm p-3">
                                        <p className="text-xs text-text-secondary mb-0.5">Total interest paid</p>
                                        <p className="font-semibold text-danger">
                                            {fmt(payoff.total_interest_paid)}
                                        </p>
                                        {interestSaved != null && interestSaved > 0 && (
                                            <p className="text-xs text-success mt-0.5">
                                                {fmt(interestSaved)} saved vs. minimums
                                            </p>
                                        )}
                                    </div>

                                    {/* Payoff order */}
                                    <div className="bg-bg-tertiary rounded-sm p-3">
                                        <p className="text-xs text-text-secondary mb-1">Payoff order</p>
                                        <div className="space-y-0.5">
                                            {payoff.payoff_order.slice(0, 3).map((d, i) => (
                                                <p
                                                    key={d.debt_id}
                                                    className="text-xs font-medium text-text-primary truncate"
                                                    title={d.name}
                                                >
                                                    {i + 1}. {d.name}
                                                    {d.payoff_date && (
                                                        <span className="text-text-secondary font-normal ml-1">
                                                            — {fmtYearMonth(d.payoff_date)}
                                                        </span>
                                                    )}
                                                </p>
                                            ))}
                                            {payoff.payoff_order.length > 3 && (
                                                <p className="text-xs text-text-secondary">
                                                    +{payoff.payoff_order.length - 3} more
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Balance projection chart */}
                            {loadingPayoff ? (
                                <div className="h-64 bg-bg-tertiary rounded-sm animate-pulse" />
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(128,128,128,0.12)"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={fmtXTick}
                                            tick={{ fill: "#8B92A8", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fill: "#8B92A8", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={fmtShort}
                                            width={56}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            itemStyle={{ color: "var(--text-primary)" }}
                                            formatter={(v, name) => [fmt(v), name]}
                                            labelFormatter={fmtYearMonth}
                                        />
                                        <Legend
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                                        />
                                        {debtNames.map((name, i) => (
                                            <Line
                                                key={name}
                                                type="monotone"
                                                dataKey={name}
                                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : null}

                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closeModal}
                >
                    <div
                        className="bg-bg-secondary w-full max-w-md rounded-lg shadow-xl border border-border overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-border">
                            <h2 className="text-lg font-semibold">
                                {modalMode === "create" ? "Add Debt" : "Edit Debt"}
                            </h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {formError && (
                                <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-sm rounded-sm">
                                    {formError}
                                </div>
                            )}

                            <FormField label="Name">
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. Visa Credit Card"
                                    className={INPUT_CLS}
                                    required
                                />
                            </FormField>

                            <FormField label="Type">
                                <div className="relative">
                                    <select
                                        value={formType}
                                        onChange={e => setFormType(e.target.value)}
                                        className={`${INPUT_CLS} pr-8 cursor-pointer appearance-none`}
                                    >
                                        {DEBT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Current Balance">
                                    <CurrencyInput
                                        value={formBalance}
                                        onChange={e => setFormBalance(e.target.value)}
                                        required
                                    />
                                </FormField>
                                <FormField label="Annual Interest Rate">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={formRate}
                                            onChange={e => setFormRate(e.target.value)}
                                            placeholder="0.00"
                                            className={`${INPUT_CLS} pr-8`}
                                            required
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">%</span>
                                    </div>
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Minimum Payment">
                                    <CurrencyInput
                                        value={formMinPay}
                                        onChange={e => setFormMinPay(e.target.value)}
                                        required
                                    />
                                </FormField>
                                <FormField label="Due Date (optional)">
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formDueDate}
                                        onChange={e => setFormDueDate(e.target.value)}
                                        placeholder="Day 1–31"
                                        className={INPUT_CLS}
                                    />
                                </FormField>
                            </div>

                            {/* ── Link to CC statement (auto-update) ──────── */}
                            <FormField label="Link to credit card statement (optional)">
                                <div className="relative">
                                    <select
                                        value={formLinkedBank}
                                        onChange={e => setFormLinkedBank(e.target.value)}
                                        className={`${INPUT_CLS} pr-8 cursor-pointer appearance-none`}
                                    >
                                        <option value="">None — no auto-update</option>
                                        {ccBanks.map(bank => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                                {ccBanks.length === 0 && (
                                    <p className="text-xs text-text-secondary mt-1">
                                        No CC statements uploaded yet — upload one on the Transactions page.
                                    </p>
                                )}
                            </FormField>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2 border border-border rounded-sm text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 bg-brand text-white rounded-sm text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Saving…" : modalMode === "create" ? "Add Debt" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Record Payment dialog ─────────────────────────────────────── */}
            {paymentTarget && (
                <div
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closePayment}
                >
                    <div
                        className="bg-bg-secondary w-full max-w-sm rounded-lg shadow-xl border border-border overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center text-brand">
                                <DollarSign size={16} />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold leading-tight">Record Payment</h2>
                                <p className="text-xs text-text-secondary">{paymentTarget.name}</p>
                            </div>
                        </div>
                        <form onSubmit={handlePayment} className="p-6 space-y-4">
                            {paymentError && (
                                <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-sm rounded-sm">
                                    {paymentError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Payment Amount
                                </label>
                                <CurrencyInput
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Minimum payment: {fmt(paymentTarget.minimum_payment)}
                                </p>
                            </div>

                            <p className="text-xs text-text-secondary">
                                Current balance:{" "}
                                <span className="font-medium text-text-primary">{fmt(paymentTarget.balance)}</span>
                                {" "}→ new balance:{" "}
                                <span className="font-medium text-success">
                                    {fmt(Math.max(0, Number(paymentTarget.balance) - (parseFloat(paymentAmount) || 0)))}
                                </span>
                            </p>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={closePayment}
                                    className="flex-1 py-2 border border-border rounded-sm text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={paymentSaving}
                                    className="flex-1 py-2 bg-brand text-white rounded-sm text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50"
                                >
                                    {paymentSaving ? "Saving…" : "Record Payment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete confirm modal ──────────────────────────────────────── */}
            {debtToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-bg-secondary w-full max-w-sm rounded-lg shadow-xl border border-border p-6 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4 text-danger">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Delete Debt?</h3>
                        <p className="text-text-secondary text-sm text-center mb-6">
                            Are you sure you want to delete{" "}
                            <strong className="text-text-primary">{debtToDelete.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setDebtToDelete(null)}
                                className="flex-1 py-2 rounded-sm border border-border text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2 rounded-sm bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
