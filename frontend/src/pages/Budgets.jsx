import { useState, useEffect } from "react";
import { PiggyBank, Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import api from "../api/axiosClient";

const CATEGORIES = [
    "Food & Dining",
    "Groceries",
    "Subscriptions",
    "Transportation",
    "Shopping",
    "Health & Fitness",
    "Utilities & Bills",
    "Entertainment",
    "Travel",
    "Banking & Fees",
    "Uncategorized",
];

function formatMonthLabel(yyyyMM) {
    if (!yyyyMM || yyyyMM === "all") return "All Months";
    const [y, m] = yyyyMM.split("-");
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

const generateMonths = () => {
    const list = [{ value: "all", label: "All Months" }];
    const date = new Date();
    date.setMonth(date.getMonth() + 6); // 6 months in the future
    date.setDate(1);
    for (let i = 0; i < 48; i++) { // 4 years total
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        list.push({ value: `${yyyy}-${mm}`, label: formatMonthLabel(`${yyyy}-${mm}`) });
        date.setMonth(date.getMonth() - 1);
    }
    return list;
};

const MONTH_OPTIONS = generateMonths();

export default function Budgets() {
    const [budgets, setBudgets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
    const [selectedBudget, setSelectedBudget] = useState(null);

    // Form State
    const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
    const [formLimit, setFormLimit] = useState("");
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [formMonth, setFormMonth] = useState(currentMonthStr);
    const [error, setError] = useState("");

    const [currentFilterMonth, setCurrentFilterMonth] = useState("all");
    const [budgetToDelete, setBudgetToDelete] = useState(null);

    useEffect(() => {
        fetchData();
    }, [currentFilterMonth]);

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            api.get(`/budgets/status?month=${currentFilterMonth}`).catch(() => ({ data: [] })),
            api.get("/transactions").catch(() => ({ data: [] }))
        ])
            .then(([resBudgets, resTxns]) => {
                let sortedBudgets = resBudgets.data;
                if (currentFilterMonth === "all") {
                    sortedBudgets = resBudgets.data.sort((a, b) => {
                        return b.month.localeCompare(a.month) || a.category.localeCompare(b.category);
                    });
                }
                setBudgets(sortedBudgets);

                // Extract unique categories from transactions history
                const uniqueCategories = new Set(
                    resTxns.data.map(t => t.category).filter(Boolean)
                );

                // Add existing budget categories just in case
                resBudgets.data.forEach(b => uniqueCategories.add(b.category));

                setCategories(Array.from(uniqueCategories).sort());
            })
            .catch((err) => console.error("Failed to load budgets data:", err))
            .finally(() => setLoading(false));
    };

    const handleOpenModal = (mode, budget = null) => {
        setModalMode(mode);
        setError("");
        if (mode === "edit" && budget) {
            setSelectedBudget(budget);
            setFormCategory(budget.category);
            setFormLimit(budget.monthly_limit.toString());
            setFormMonth(budget.month);
        } else {
            setSelectedBudget(null);
            setFormCategory(CATEGORIES[0]);
            setFormLimit("");
            setFormMonth(currentMonthStr);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormCategory(CATEGORIES[0]);
        setFormLimit("");
        setError("");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError("");

        if (!formCategory) {
            setError("Category is required.");
            return;
        }

        const limitValue = parseFloat(formLimit);
        if (isNaN(limitValue) || limitValue <= 0) {
            setError("Please enter a valid monthly limit.");
            return;
        }

        try {
            if (modalMode === "create") {
                await api.post("/budgets", {
                    category: formCategory,
                    monthly_limit: limitValue,
                    month: formMonth
                });
            } else if (modalMode === "edit" && selectedBudget) {
                // Changing the month is not supported by backend PUT currently, but passing it just in case
                await api.put(`/budgets/${selectedBudget.id}`, {
                    monthly_limit: limitValue
                });
            }
            handleCloseModal();
            fetchData(); // Refresh list to get updated status
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to save budget.");
        }
    };

    const handleDelete = (budget) => {
        setBudgetToDelete(budget);
    };

    const confirmDelete = async () => {
        if (!budgetToDelete) return;
        try {
            await api.delete(`/budgets/${budgetToDelete.id}`);
            setBudgetToDelete(null);
            fetchData();
        } catch (err) {
            console.error("Failed to delete budget", err);
            alert("Failed to delete budget.");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency: "CAD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getProgressColorClass = (percentage) => {
        if (percentage < 75) return "bg-success";
        if (percentage < 90) return "bg-warning";
        return "bg-danger";
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Budgets</h1>
                    <p className="text-text-secondary text-sm">Set and track monthly spending limits by category.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={currentFilterMonth}
                            onChange={(e) => setCurrentFilterMonth(e.target.value)}
                            className="bg-bg-tertiary border border-border rounded-sm px-3 py-2 pr-8 text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer text-sm font-medium appearance-none"
                            title="Select Month"
                        >
                            {MONTH_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal("create")}
                        className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-sm font-medium hover:bg-brand/90 transition-colors"
                    >
                        <Plus size={18} />
                        <span>Create Budget</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="h-32 p-6 bg-bg-tertiary/50" />
                        </Card>
                    ))}
                </div>
            ) : budgets.length === 0 ? (
                <Card className="border-border">
                    <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center">
                            <PiggyBank size={32} strokeWidth={1.5} className="text-text-secondary" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-text-primary text-lg mb-1">No budgets set</p>
                            <p className="text-sm text-text-secondary max-w-sm mb-6">
                                Create your first budget to start tracking your spending limit for this month.
                            </p>
                            <button
                                onClick={() => handleOpenModal("create")}
                                className="bg-brand text-white px-5 py-2 rounded-sm font-medium hover:bg-brand/90 transition-colors"
                            >
                                Set a Budget
                            </button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {budgets.map((budget) => {
                        const pct = Math.min(budget.percentage_used || 0, 100);
                        const progressColor = getProgressColorClass(pct);
                        const remaining = Math.max(0, budget.monthly_limit - budget.current_spending);

                        const isCurrentMonth = budget.month === currentMonthStr;

                        return (
                            <Card
                                key={budget.id}
                                className={`border-border hover:border-brand/30 transition-all group relative overflow-hidden ${isCurrentMonth ? 'ring-2 ring-brand ring-offset-2 ring-offset-bg-primary' : ''}`}
                            >
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-lg shadow-inner">
                                                🏷️
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg leading-tight">
                                                    {budget.category}
                                                    {currentFilterMonth === "all" && (
                                                        <span className="ml-2 text-xs font-normal text-text-secondary">
                                                            ({formatMonthLabel(budget.month)})
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-xs text-text-secondary">
                                                    {budget.over_budget ? 'Over budget' : `${formatCurrency(remaining)} left`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal("edit", budget)}
                                                className="p-2 text-text-secondary hover:text-brand hover:bg-bg-tertiary rounded-sm transition-colors"
                                                title="Edit Budget"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(budget)}
                                                className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                                                title="Delete Budget"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-6">
                                        <div className="flex justify-between items-end text-sm">
                                            <span className="font-medium">{formatCurrency(budget.current_spending)}</span>
                                            <span className="text-text-secondary">of {formatCurrency(budget.monthly_limit)}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-bg-tertiary rounded-full overflow-hidden border border-border">
                                            <div
                                                className={`h-full ${progressColor} transition-all duration-500`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        {budget.over_budget && (
                                            <p className="text-xs text-danger text-right font-medium">
                                                Overspent by {formatCurrency(budget.current_spending - budget.monthly_limit)}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-bg-secondary w-full max-w-md rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border">
                            <h2 className="text-lg font-semibold">
                                {modalMode === "create" ? "Create Budget" : "Edit Budget"}
                            </h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6">
                            {error && (
                                <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger text-sm rounded-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Month
                                    </label>
                                    {modalMode === "create" ? (
                                        <div className="relative">
                                            <select
                                                value={formMonth}
                                                onChange={(e) => setFormMonth(e.target.value)}
                                                className="w-full bg-bg-tertiary border border-border rounded-sm px-3 py-2 text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer appearance-none"
                                                required
                                            >
                                                {MONTH_OPTIONS.filter(opt => opt.value !== "all").map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full bg-bg-tertiary/50 border border-border rounded-sm px-3 py-2 text-text-secondary cursor-not-allowed">
                                            {selectedBudget?.month || formMonth}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Category
                                    </label>
                                    {modalMode === "create" ? (
                                        <div className="relative">
                                            <select
                                                value={formCategory}
                                                onChange={(e) => setFormCategory(e.target.value)}
                                                className="w-full bg-bg-tertiary border border-border rounded-sm px-3 py-2 text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer appearance-none"
                                                required
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                                {/* Ensure custom categories from transaction history are also available */}
                                                {categories.filter(c => !CATEGORIES.includes(c)).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full bg-bg-tertiary/50 border border-border rounded-sm px-3 py-2 text-text-secondary cursor-not-allowed">
                                            {formCategory}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Monthly Limit
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-text-secondary">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formLimit}
                                            onChange={(e) => setFormLimit(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-bg-tertiary border border-border rounded-sm px-3 py-2 pl-7 text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-sm hover:bg-brand/90 transition-colors"
                                >
                                    {modalMode === "create" ? "Create Budget" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Modal */}
            {budgetToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg-secondary w-full max-w-sm rounded-lg shadow-xl border border-border p-6 flex flex-col items-center zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4 text-danger shadow-inner">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Delete Budget?</h3>
                        <p className="text-text-secondary text-sm text-center mb-6">
                            Are you sure you want to delete the <strong className="text-text-primary">{budgetToDelete.category}</strong> budget for {formatMonthLabel(budgetToDelete.month)}? This action cannot be undone.
                        </p>
                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setBudgetToDelete(null)}
                                className="flex-1 py-2 rounded-sm border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2 rounded-sm bg-danger text-white text-sm font-medium hover:bg-danger/90 shadow-sm transition-colors"
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
