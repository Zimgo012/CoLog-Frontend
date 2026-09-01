import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SessionExpiredModal() {
    const { isExpired, dismissExpired } = useAuth();
    const navigate = useNavigate();

    if (!isExpired) return null;

    function handleLogin() {
        dismissExpired();
        navigate("/login", { replace: true });
    }

    return (
        /* Backdrop */
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center gap-4">

                <span className="text-5xl">⏰</span>

                <div>
                    <h2 className="text-xl font-bold">Session Expired</h2>
                    <p className="text-base-content/60 text-sm mt-1">
                        Your session has expired. Please log in again to continue.
                    </p>
                </div>

                <button
                    onClick={handleLogin}
                    className="btn btn-primary w-full"
                >
                    Go to Login
                </button>

            </div>
        </div>
    );
}
