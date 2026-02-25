import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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

const CHEQUING_TYPES     = ["purchase", "income", "cc_payment", "debt_payment", "e-transfer", "refund", "transfer"];
const CREDIT_CARD_TYPES  = ["purchase", "refund", "cc_payment"];

function fmt(amount) {
    const n = parseFloat(amount);
    return `${n < 0 ? "-" : "+"}$${Math.abs(n).toFixed(2)}`;
}

/* ── Confidence dot ──────────────────────────────────────────────────── */
function ConfidenceDot({ confidence }) {
    const c = parseFloat(confidence);
    const colorClass =
        c > 0.8 ? "bg-success" : c >= 0.5 ? "bg-warning" : "bg-orange-400";
    const label =
        c > 0.8 ? "High confidence" : c >= 0.5 ? "Medium confidence" : "Low confidence";
    return (
        <span
            title={`${label} (${Math.round(c * 100)}%)`}
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorClass}`}
        />
    );
}

/* ── Debt-match helper ───────────────────────────────────────────────── */
function guessDebtId(description, debts) {
    if (!debts.length) return null;
    const desc = description.toLowerCase();
    // VISA in description → find a debt whose name contains 'visa'
    if (/visa/i.test(desc)) {
        const match = debts.find(d => /visa/i.test(d.name));
        if (match) return match.id;
    }
    return null;
}

/* ── Review modal ────────────────────────────────────────────────────── */
function ReviewModal({ preview, onConfirm, onCancel, confirming }) {
    const isChequing = preview[0]?.source !== "credit_card";
    const typeOptions = isChequing ? CHEQUING_TYPES : CREDIT_CARD_TYPES;

    // ── Available debts for the "Which debt?" dropdown ────────────────
    const [debts,        setDebts]        = useState([]);
    const [loadingDebts, setLoadingDebts] = useState(true);

    useEffect(() => {
        api.get("/debts/list-simple")
            .then(res => setDebts(res.data))
            .catch(() => setDebts([]))
            .finally(() => setLoadingDebts(false));
    }, []);

    // ── Row state ─────────────────────────────────────────────────────
    const [rows, setRows] = useState(
        () => preview.map((txn) => ({
            ...txn,
            _original:     txn.category,
            _originalType: txn.transaction_type,
            transaction_type_source: null,
            debt_id: null,
        }))
    );

    // ── Auto-match debts once debts are loaded ────────────────────────
    useEffect(() => {
        if (loadingDebts || !debts.length) return;
        setRows(prev => prev.map(row => {
            if (row.transaction_type !== "debt_payment" || row.debt_id !== null) return row;
            const guessed = guessDebtId(row.description, debts);
            return guessed ? { ...row, debt_id: guessed } : row;
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingDebts]);

    // ── Handlers ──────────────────────────────────────────────────────
    const handleCategoryChange = (idx, newCat) => {
        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== idx) return row;
                const changed = newCat !== row._original;
                return {
                    ...row,
                    category: newCat,
                    category_source: changed ? "manual" : preview[idx].category_source,
                };
            })
        );
    };

    const handleTypeChange = (idx, newType) => {
        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== idx) return row;
                const changed = newType !== (row._originalType ?? "purchase");
                // Auto-guess debt when user switches this row to debt_payment
                const newDebtId = newType === "debt_payment"
                    ? (row.debt_id ?? guessDebtId(row.description, debts))
                    : row.debt_id;
                return {
                    ...row,
                    transaction_type: newType,
                    transaction_type_source: changed ? "manual" : null,
                    debt_id: newDebtId,
                };
            })
        );
    };

    const handleDebtChange = (idx, debtId) => {
        setRows(prev => prev.map((row, i) =>
            i === idx ? { ...row, debt_id: debtId ? Number(debtId) : null } : row
        ));
    };

    // ── Derived counts ────────────────────────────────────────────────
    const changedCatCount  = rows.filter((r) => r.category_source === "manual").length;
    const changedTypeCount = rows.filter((r) => r.transaction_type_source === "manual").length;
    const unlinkedCount    = rows.filter(
        (r) => r.transaction_type === "debt_payment" && !r.debt_id
    ).length;

    // ── Confirm with validation ───────────────────────────────────────
    const handleConfirmClick = () => {
        if (unlinkedCount > 0) return; // button disabled, but belt-and-suspenders
        onConfirm(rows);
    };

    const SELECT_CLS = (changed) =>
        `text-sm px-2.5 py-1.5 rounded-sm border outline-none cursor-pointer transition-colors
         bg-bg-tertiary text-text-primary hover:border-brand focus:border-brand
         ${changed ? "border-brand/70 text-brand font-semibold bg-brand/[0.08]" : "border-border"}`;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
            <div className="bg-bg-secondary border border-border rounded-md shadow-2xl w-full max-w-6xl flex flex-col">

                {/* ── Modal header ── */}
                <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-6 flex-wrap">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Review Transactions</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            {rows.length} transaction{rows.length !== 1 ? "s" : ""} parsed.{" "}
                            {changedCatCount > 0 && (
                                <span className="text-brand font-medium">
                                    {changedCatCount} categor{changedCatCount !== 1 ? "ies" : "y"} edited.{" "}
                                </span>
                            )}
                            {changedTypeCount > 0 && (
                                <span className="text-brand font-medium">
                                    {changedTypeCount} type{changedTypeCount !== 1 ? "s" : ""} edited.
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-success inline-block" />
                            High (&gt;80%)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                            Medium (50–80%)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                            Low (&lt;50%)
                        </span>
                    </div>
                </div>

                {/* ── Scrollable table ── */}
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border sticky top-0 bg-bg-secondary z-10">
                                <th className="px-4 py-3 text-text-secondary font-medium text-xs w-6" />
                                <th className="px-4 py-3 text-text-secondary font-medium text-xs whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 text-text-secondary font-medium text-xs">Description</th>
                                <th className="px-4 py-3 text-text-secondary font-medium text-xs">Category</th>
                                <th className="px-4 py-3 text-text-secondary font-medium text-xs">Type</th>
                                <th className="px-4 py-3 text-text-secondary font-medium text-xs text-right whitespace-nowrap">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const catChanged  = row.category_source === "manual";
                                const typeChanged = row.transaction_type_source === "manual";
                                const isDebtPayment = row.transaction_type === "debt_payment";
                                const needsDebt     = isDebtPayment && !row.debt_id;
                                const rowHighlighted = catChanged || typeChanged;
                                return (
                                    <tr
                                        key={idx}
                                        className={`border-b border-border last:border-0 transition-colors ${
                                            needsDebt
                                                ? "bg-warning/[0.05]"
                                                : rowHighlighted
                                                    ? "bg-brand/[0.06]"
                                                    : "hover:bg-white/[0.03]"
                                        }`}
                                    >
                                        {/* Confidence dot */}
                                        <td className="pl-4 pr-2 py-3">
                                            <ConfidenceDot confidence={row.confidence} />
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                                            {row.date}
                                        </td>

                                        {/* Description */}
                                        <td className="px-4 py-3 text-sm max-w-[180px]">
                                            <span className="block truncate" title={row.description}>
                                                {row.description}
                                            </span>
                                        </td>

                                        {/* Category — editable */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={row.category}
                                                    onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                                    className={SELECT_CLS(catChanged)}
                                                >
                                                    {CATEGORIES.map((cat) => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                {catChanged && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                                                        edited
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Transaction type + optional debt selector */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={row.transaction_type ?? "purchase"}
                                                        onChange={(e) => handleTypeChange(idx, e.target.value)}
                                                        className={SELECT_CLS(typeChanged)}
                                                    >
                                                        {typeOptions.map((t) => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                    {typeChanged && (
                                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                                                            edited
                                                        </span>
                                                    )}
                                                </div>

                                                {/* ── Which debt? ── */}
                                                {isDebtPayment && (
                                                    <div>
                                                        {loadingDebts ? (
                                                            <div className="h-7 w-36 bg-bg-tertiary rounded animate-pulse" />
                                                        ) : debts.length === 0 ? (
                                                            <p className="text-xs text-text-secondary">
                                                                No debts added yet —{" "}
                                                                <Link
                                                                    to="/dashboard/debt"
                                                                    className="text-brand hover:underline"
                                                                >
                                                                    add one
                                                                </Link>
                                                            </p>
                                                        ) : (
                                                            <select
                                                                value={row.debt_id ?? ""}
                                                                onChange={(e) => handleDebtChange(idx, e.target.value)}
                                                                className={`text-xs px-2 py-1.5 rounded-sm border outline-none cursor-pointer transition-colors bg-bg-tertiary text-text-primary hover:border-brand focus:border-brand ${
                                                                    needsDebt
                                                                        ? "border-warning/70 text-warning"
                                                                        : "border-border"
                                                                }`}
                                                            >
                                                                <option value="">Which debt?</option>
                                                                {debts.map(d => (
                                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td
                                            className={`px-4 py-3 text-right text-sm font-semibold whitespace-nowrap ${
                                                parseFloat(row.amount) < 0
                                                    ? "text-text-primary"
                                                    : "text-success"
                                            }`}
                                        >
                                            {fmt(row.amount)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
                    <button
                        onClick={onCancel}
                        disabled={confirming}
                        className="px-5 py-2 rounded-sm border border-border text-text-secondary text-sm font-medium
                            hover:bg-bg-accent hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-4">
                        {unlinkedCount > 0 && (
                            <p className="text-xs text-warning">
                                {unlinkedCount} debt payment{unlinkedCount !== 1 ? "s" : ""} need a debt selected.
                            </p>
                        )}
                        <button
                            onClick={handleConfirmClick}
                            disabled={confirming || unlinkedCount > 0}
                            className="btn-primary text-sm px-6 py-2.5 disabled:opacity-70 disabled:cursor-not-allowed
                                disabled:translate-y-0 disabled:shadow-none"
                        >
                            {confirming
                                ? "Saving…"
                                : `Confirm & Save ${rows.length} Transaction${rows.length !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function Transactions() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);   // null = no review open
    const [confirming, setConfirming] = useState(false);
    const [savedTxns, setSavedTxns] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSaved();
    }, []);

    const fetchSaved = () => {
        setLoadingSaved(true);
        api.get("/transactions")
            .then((res) => setSavedTxns(res.data))
            .catch(() => setSavedTxns([]))
            .finally(() => setLoadingSaved(false));
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0] ?? null);
        setError(null);
        setSuccessMsg("");
    };

    const handleUpload = async () => {
        if (!file) { setError("Please select a PDF file first."); return; }
        setUploading(true);
        setError(null);
        setSuccessMsg("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/transactions/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setPreview(res.data); // list[TransactionPreview]
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to upload file.");
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = async (rows) => {
        setConfirming(true);
        try {
            const res = await api.post("/transactions/confirm", {
                transactions: rows.map(({
                    date, description, amount,
                    category, category_source,
                    source, transaction_type, transaction_type_source,
                    debt_id,
                }) => ({
                    date,
                    description,
                    amount,
                    category,
                    category_source,
                    source,
                    transaction_type,
                    transaction_type_source,
                    debt_id: debt_id ?? null,
                })),
            });
            const created = res.data.transactions_created;
            const skipped = res.data.transactions_skipped;
            setSuccessMsg(
                `Saved ${created} transaction${created !== 1 ? "s" : ""}.` +
                (skipped > 0 ? ` ${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped.` : "")
            );
            setPreview(null);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            fetchSaved();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to save transactions.");
        } finally {
            setConfirming(false);
        }
    };

    const handleCancel = () => {
        setPreview(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <>
            {/* Review modal — rendered outside the page flow so it overlays everything */}
            {preview && (
                <ReviewModal
                    preview={preview}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirming={confirming}
                />
            )}

            <div className="max-w-5xl mx-auto">
                {/* ── Page header + upload controls ── */}
                <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl mb-2 font-bold">Transactions</h1>
                        <p className="text-text-secondary">Manage and analyze your spending.</p>
                    </div>

                    <div className="flex gap-2.5 items-center flex-wrap">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            id="file-upload"
                            className="hidden"
                        />
                        <label
                            htmlFor="file-upload"
                            className="bg-bg-secondary border border-border text-text-primary inline-block px-4 py-2.5
                                rounded-sm cursor-pointer hover:bg-bg-accent transition-colors text-sm max-w-[200px] truncate"
                            title={file?.name}
                        >
                            {file ? file.name : "Select PDF"}
                        </label>

                        <button
                            className="btn-primary text-sm disabled:opacity-70 disabled:cursor-not-allowed
                                disabled:translate-y-0 disabled:shadow-none"
                            onClick={handleUpload}
                            disabled={uploading || !file}
                        >
                            {uploading ? "Parsing…" : "Upload & Parse"}
                        </button>
                    </div>
                </div>

                {/* ── Alerts ── */}
                {error && (
                    <div className="bg-danger/10 text-danger p-4 rounded-sm mb-6 border border-danger/20 text-sm">
                        ⚠️ {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-success/10 text-success p-4 rounded-sm mb-6 border border-success/20 text-sm">
                        ✅ {successMsg}
                    </div>
                )}

                {/* ── Saved transactions table ── */}
                <div className="card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-border">
                                <th className="p-4 text-text-secondary font-medium text-sm">Date</th>
                                <th className="p-4 text-text-secondary font-medium text-sm">Description</th>
                                <th className="p-4 text-text-secondary font-medium text-sm">Category</th>
                                <th className="p-4 text-text-secondary font-medium text-sm text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingSaved ? (
                                [0, 1, 2, 3].map((i) => (
                                    <tr key={i} className="border-b border-border">
                                        <td className="p-4"><div className="h-4 w-24 bg-bg-tertiary rounded animate-pulse" /></td>
                                        <td className="p-4"><div className="h-4 w-52 bg-bg-tertiary rounded animate-pulse" /></td>
                                        <td className="p-4"><div className="h-4 w-24 bg-bg-tertiary rounded animate-pulse" /></td>
                                        <td className="p-4 flex justify-end"><div className="h-4 w-16 bg-bg-tertiary rounded animate-pulse" /></td>
                                    </tr>
                                ))
                            ) : savedTxns.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-text-secondary text-sm">
                                        No transactions yet. Upload a bank statement to get started.
                                    </td>
                                </tr>
                            ) : (
                                savedTxns.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className="border-b border-border last:border-0 hover:bg-white/[0.03] transition-colors"
                                    >
                                        <td className="p-4 text-sm text-text-secondary whitespace-nowrap">{txn.date}</td>
                                        <td className="p-4 text-sm max-w-xs">
                                            <span className="block truncate" title={txn.description}>
                                                {txn.description}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-brand/10 text-brand px-2 py-1 rounded text-xs font-medium">
                                                {txn.category || "Uncategorized"}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-semibold text-sm whitespace-nowrap ${
                                            parseFloat(txn.amount) < 0 ? "text-text-primary" : "text-success"
                                        }`}>
                                            {fmt(txn.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
