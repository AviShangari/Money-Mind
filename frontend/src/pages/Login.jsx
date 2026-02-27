import { Brain } from "lucide-react";

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
        <div className="h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_right,#1e293b_0%,#0f172a_100%)]">
            <div className="glass-panel p-12 rounded-lg text-center w-full max-w-[400px] shadow-lg">
                <div className="mb-8 flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <Brain className="w-9 h-9 text-white" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold mb-2 text-text-primary">
                    Money Mind
                </h1>

                <p className="text-text-secondary mb-10">
                    Master your finances with AI-powered insights.
                </p>

                <button
                    className="btn-primary w-full text-base flex items-center justify-center gap-2.5"
                    onClick={redirectToGoogle}
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
