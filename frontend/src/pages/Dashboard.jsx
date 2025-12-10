import { useEffect, useState } from "react";
import api from "../api/axiosClient";

function Dashboard() {
    const [email, setEmail] = useState("");

    useEffect(() => {
        console.log("!!! DASHBOARD COMPONENT MOUNTED !!!");
        async function fetchUser() {
            try {
                const res = await api.get("/protected/me");
                setEmail(res.data.user_email);
            } catch (err) {
                console.log(err);
                window.location.href = "/";
            }
        }

        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
            window.location.href = "/";
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Welcome to Money Mind</h1>
            <h2>{email}</h2>

            <button
                style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    background: "#4CAF50",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "16px",
                    borderRadius: "8px"
                }}
                onClick={() => (window.location.href = "/upload")}
            >
                Upload Bank Statement
            </button>

            <br /><br />

            <button
                style={{
                    padding: "8px 14px",
                    background: "red",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    borderRadius: "6px"
                }}
                onClick={handleLogout}
            >
                Logout
            </button>
            <p>...{email}</p>
        </div>
    );
}

export default Dashboard;
