import { useState, useEffect } from "react";
import api from "../../api/axiosClient";

const fmt = (n) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n ?? 0);

export default function IncomeModal({ open, onClose, onSaved }) {
    const [base, setBase] = useState("");
    const [side, setSide] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Load current settings whenever modal opens
    useEffect(() => {
        if (!open) return;
        api.get("/users/income")
            .then((res) => {
                setBase(res.data.base_income ?? "");
                setSide(res.data.side_income ?? "");
            })
            .catch(() => {
                setBase("");
                setSide("");
            });
    }, [open]);

    function handleSave() {
        setSaving(true);
        setError(null);
        api.put("/users/income", {
            base_income: base === "" ? null : parseFloat(base),
            side_income: side === "" ? null : parseFloat(side),
        })
            .then(() => {
                onSaved();
                onClose();
            })
            .catch(() => setError("Failed to save. Please try again."))
            .finally(() => setSaving(false));
    }

    if (!open) return null;

    const total = (parseFloat(base) || 0) + (parseFloat(side) || 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-bg-secondary border border-border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold text-text-primary mb-1">
                    Monthly Income
                </h2>
                <p className="text-xs text-text-secondary mb-5">
                    Used to estimate cash flow when only credit card statements are uploaded.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Base income (salary / wages)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full pl-7 pr-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                placeholder="0.00"
                                value={base}
                                onChange={(e) => setBase(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Side income (freelance, other)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full pl-7 pr-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                                placeholder="0.00"
                                value={side}
                                onChange={(e) => setSide(e.target.value)}
                            />
                        </div>
                    </div>

                    {total > 0 && (
                        <p className="text-sm text-text-secondary">
                            Total: <span className="font-semibold text-text-primary">{fmt(total)}</span>/month
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-danger">{error}</p>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-bg-tertiary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
