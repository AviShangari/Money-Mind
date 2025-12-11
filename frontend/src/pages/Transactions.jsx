import { useState } from "react";
import api from "../api/axiosClient";

function Transactions() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError(null);
        setSuccessMsg("");
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a PDF file first.");
            return;
        }

        setUploading(true);
        setError(null);
        setSuccessMsg("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/transactions/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setSuccessMsg(`Successfully processed ${res.data.transactions_created} transactions.`);

            if (res.data.transactions) {
                setTransactions(res.data.transactions);
            } else {
                setTransactions([]);
            }

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to upload file.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl mb-2 font-bold">Transactions</h1>
                    <p className="text-text-secondary">Manage and analyze your spending.</p>
                </div>

                <div className="flex gap-2.5 items-center">
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        id="file-upload"
                        className="hidden"
                    />
                    <label
                        htmlFor="file-upload"
                        className="bg-bg-secondary border border-border text-text-primary inline-block px-4 py-2.5 rounded-sm cursor-pointer hover:bg-bg-accent transition-colors"
                    >
                        {file ? file.name : "Select PDF"}
                    </label>

                    <button
                        className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
                        onClick={handleUpload}
                        disabled={uploading || !file}
                    >
                        {uploading ? "Parsing..." : "Upload & Parse"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-danger/10 text-danger p-4 rounded-sm mb-6 border border-danger/20">
                    ⚠️ {error}
                </div>
            )}

            {successMsg && (
                <div className="bg-success/10 text-success p-4 rounded-sm mb-6 border border-success/20">
                    ✅ {successMsg}
                </div>
            )}

            <div className="card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-border">
                            <th className="p-4 text-text-secondary font-medium">Date</th>
                            <th className="p-4 text-text-secondary font-medium">Description</th>
                            <th className="p-4 text-text-secondary font-medium">Category</th>
                            <th className="p-4 text-text-secondary font-medium text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-12 text-center text-text-secondary">
                                    No transactions to display. Upload a statement to get started.
                                </td>
                            </tr>
                        ) : (
                            transactions.map((txn, idx) => (
                                <tr key={idx} className="border-b border-border last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="p-4">{txn.date}</td>
                                    <td className="p-4">{txn.description}</td>
                                    <td className="p-4">
                                        <span className="bg-brand/10 text-brand px-2 py-1 rounded text-xs font-medium">
                                            Uncategorized
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-semibold ${txn.amount < 0 ? "text-text-primary" : "text-success"}`}>
                                        {txn.amount < 0 ? "-" : "+"}${Math.abs(txn.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Transactions;
