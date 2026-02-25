import { useState, useEffect } from "react";
import api from "../api/axiosClient";

const fmt = (n) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n ?? 0);

function formatUpdatedAt(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function Settings() {
    const [base, setBase] = useState("");
    const [side, setSide] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get("/users/income")
            .then((res) => {
                setBase(res.data.base_income ?? "");
                setSide(res.data.side_income ?? "");
                setUpdatedAt(res.data.income_updated_at ?? null);
            })
            .catch(() => {});
    }, []);

    function handleSave() {
        setSaving(true);
        setSaved(false);
        setError(null);
        api.put("/users/income", {
            base_income: base === "" ? null : parseFloat(base),
            side_income: side === "" ? null : parseFloat(side),
        })
            .then((res) => {
                setUpdatedAt(res.data.income_updated_at ?? null);
                setSaved(true);
            })
            .catch(() => setError("Failed to save. Please try again."))
            .finally(() => setSaving(false));
    }

    const total = (parseFloat(base) || 0) + (parseFloat(side) || 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Settings</h1>
                <p className="text-text-secondary text-sm">Manage your account preferences.</p>
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl p-6 max-w-md">
                <h2 className="text-lg font-semibold text-text-primary mb-1">Monthly Income</h2>
                <p className="text-xs text-text-secondary mb-5">
                    Used to calculate net cash flow alongside any income-tagged deposits from
                    uploaded statements.
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
                                onChange={(e) => { setBase(e.target.value); setSaved(false); }}
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
                                onChange={(e) => { setSide(e.target.value); setSaved(false); }}
                            />
                        </div>
                    </div>

                    {total > 0 && (
                        <p className="text-sm text-text-secondary">
                            Total: <span className="font-semibold text-text-primary">{fmt(total)}</span>/month
                        </p>
                    )}

                    {updatedAt && (
                        <p className="text-xs text-text-secondary">
                            Last updated: {formatUpdatedAt(updatedAt)}
                        </p>
                    )}

                    {error && <p className="text-sm text-danger">{error}</p>}
                    {saved && <p className="text-sm text-success">Saved successfully.</p>}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-6 w-full py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {saving ? "Saving…" : "Save"}
                </button>
            </div>
        </div>
    );
}
