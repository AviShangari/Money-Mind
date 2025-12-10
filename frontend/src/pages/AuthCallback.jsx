import { useEffect, useRef } from "react";
import api from "../api/axiosClient";

function AuthCallback() {
    const called = useRef(false);

    useEffect(() => {
        if (called.current) return;
        called.current = true;

        const hash = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hash.get("id_token");

        if (!idToken) {
            alert("No ID token in callback!");
            window.location.href = "/";
            return;
        }

        const sendToken = async () => {
            try {
                await api.post("/auth/google-login", { id_token: idToken });
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

    return <h2>Signing you in…</h2>;
}

export default AuthCallback;
