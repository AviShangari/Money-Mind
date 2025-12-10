function Login() {
    const redirectToGoogle = () => {
        const nonce = crypto.randomUUID(); // ← REQUIRED FOR id_token

        const params = new URLSearchParams({
            client_id: "327333025212-le4e5sc52b9hbt1p77c8s18ef2bnnskt.apps.googleusercontent.com",
            redirect_uri: "http://localhost:5173/auth/callback",
            response_type: "id_token",
            scope: "openid email profile",
            prompt: "select_account",
            nonce: nonce      // ← REQUIRED
        });

        window.location.href =
            "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
    };


    return (
        <div style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)"
        }}>
            <div className="glass-panel" style={{
                padding: "3rem",
                borderRadius: "var(--radius-lg)",
                textAlign: "center",
                width: "100%",
                maxWidth: "400px",
                boxShadow: "var(--shadow-lg)"
            }}>
                <div style={{
                    marginBottom: "2rem",
                    fontSize: "3rem"
                }}>
                    💸
                </div>

                <h1 style={{
                    fontSize: "2rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    color: "var(--text-primary)"
                }}>
                    Money Mind
                </h1>

                <p style={{
                    color: "var(--text-secondary)",
                    marginBottom: "2.5rem"
                }}>
                    Master your finances with AI-powered insights.
                </p>

                <button
                    className="btn-primary"
                    onClick={redirectToGoogle}
                    style={{
                        width: "100%",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px"
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.8-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z" />
                    </svg>
                    Continue with Google
                </button>
            </div>
        </div>
    );
}

export default Login;
