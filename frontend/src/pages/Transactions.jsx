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

            // The backend returns an example transaction, but in a real app 
            // we probably want to fetch the full list or the backend should return the list.
            // For now, let's assume the backend returns the count, and we might need to fetch them.
            // BUT, looking at the router.py code:
            // It returns: { "message": ..., "transactions_created": ..., "example_transaction": ... }
            // It doesn't return the full list. We should fix the backend to return the list 
            // OR fetch the list after upload. 
            // For this specific MVP request, I'll fetch the transactions right after upload 
            // (assuming a GET endpoint exists, or I will create one).

            // Wait! The user asked to "display the transactions". 
            // Let's modify the backend to return the list of inserted transactions for immediate display.

            setSuccessMsg(`Successfully processed ${res.data.transactions_created} transactions.`);

            // TEMP: If the backend returns the list (we'll modify it next), we use it.
            if (res.data.transactions) {
                setTransactions(res.data.transactions);
            } else {
                // Fallback if backend isn't updated yet
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
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Transactions</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Manage and analyze your spending.</p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        id="file-upload"
                        style={{ display: "none" }}
                    />
                    <label
                        htmlFor="file-upload"
                        className="btn-primary"
                        style={{
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                            display: "inline-block",
                            padding: "10px 16px"
                        }}
                    >
                        {file ? file.name : "Select PDF"}
                    </label>

                    <button
                        className="btn-primary"
                        onClick={handleUpload}
                        disabled={uploading || !file}
                        style={{ opacity: uploading ? 0.7 : 1 }}
                    >
                        {uploading ? "Parsing..." : "Upload & Parse"}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "var(--danger)",
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "1.5rem"
                }}>
                    ⚠️ {error}
                </div>
            )}

            {successMsg && (
                <div style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "var(--success)",
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "1.5rem"
                }}>
                    ✅ {successMsg}
                </div>
            )}

            <div className="card" style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "500" }}>Date</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "500" }}>Description</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "500" }}>Category</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: "500", textAlign: "right" }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                    No transactions to display. Upload a statement to get started.
                                </td>
                            </tr>
                        ) : (
                            transactions.map((txn, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "1rem" }}>{txn.date}</td>
                                    <td style={{ padding: "1rem" }}>{txn.description}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{
                                            background: "rgba(59, 130, 246, 0.1)",
                                            color: "var(--primary)",
                                            padding: "4px 8px",
                                            borderRadius: "4px",
                                            fontSize: "0.8rem"
                                        }}>
                                            Uncategorized
                                        </span>
                                    </td>
                                    <td style={{
                                        padding: "1rem",
                                        textAlign: "right",
                                        fontWeight: "600",
                                        color: txn.amount < 0 ? "var(--text-primary)" : "var(--success)"
                                    }}>
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
