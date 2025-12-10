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
        <div style={{ textAlign: "center", marginTop: "100px" }}>
            <h1>Money Mind Login</h1>
            <button
                onClick={redirectToGoogle}
                style={{
                    padding: "12px 24px",
                    fontSize: "18px",
                    cursor: "pointer",
                    borderRadius: "8px",
                }}
            >
                Sign in with Google
            </button>
        </div>
    );
}

export default Login;
