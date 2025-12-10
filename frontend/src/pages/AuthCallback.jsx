import { useEffect, useRef } from "react";
import api from "../api/axiosClient";


function AuthCallback() {
    console.log("== AuthCallback component file LOADED ==");

    const called = useRef(false);

    useEffect(() => {
        if (called.current) return;
        called.current = true;

        console.log("Callback mounted - processing");

        const hash = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hash.get("id_token");

        console.log("Extracted idToken:", idToken?.slice(0, 20) + "...");

        if (!idToken) {
            alert("No ID token in callback!");
            window.location.href = "/";
            return;
        }

        const sendToken = async () => {
            try {
                console.log("Sending token to backend...");
                await api.post("/auth/google-login", { id_token: idToken });
                console.log("Login successful, redirecting...");
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 100);

            } catch (err) {
                console.error("Backend error details:", err);
                alert("Login failed");
                window.location.href = "/";
            }
        };

        sendToken();
    }, []);
    console.log("CALLING login endpoint now");
    return <h2>Signing you in…xxx123</h2>;
}

export default AuthCallback;
