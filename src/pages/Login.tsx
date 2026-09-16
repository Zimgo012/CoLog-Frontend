import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { login as loginApi } from "../api/login";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/AuthShell";

export default function Login() {

    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const registeredUsername = (location.state as { registeredUsername?: string } | null)?.registeredUsername;

    const {
        isAuthenticated,
        login: saveToken
    } = useAuth();

    // Already logged in
    if (isAuthenticated) {
        return <Navigate to="/diary" replace />;
    }

    async function submit(
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> {

        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);

        const username = formData.get("username");
        const password = formData.get("password");

        if (
            typeof username !== "string" ||
            typeof password !== "string"
        ) {
            return;
        }

        setLoading(true);

        try {

            const response = await loginApi(username, password);

            // Store full profile through AuthContext
            saveToken(response);

            // Login succeeded
            navigate("/diary");

        } catch (err) {

            console.error(err);
            setError(errorMessage(err, "Unable to log in. Please try again."));

        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell eyebrow="Welcome back" title="Good to see you." description="Log in to continue where you left off.">
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={submit}
                    >

                        {registeredUsername && (
                            <div role="status" className="alert alert-success py-2.5 px-3.5 text-sm">
                                <span>Email verified. You can log in now.</span>
                            </div>
                        )}

                        {error && (
                            <div role="alert" className="alert alert-error py-2.5 px-3.5 text-sm">
                                <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <label className="form-control w-full">
                            <div className="label">
                                <span className="label-text">
                                    Username
                                </span>
                            </div>

                            <input
                                name="username"
                                type="text"
                                placeholder="jdoe223"
                                className="input input-bordered w-full"
                                defaultValue={registeredUsername}
                            />
                        </label>

                        <label className="form-control w-full">
                            <div className="label">
                                <span className="label-text">
                                    Password
                                </span>

                                <a
                                    href="#"
                                    className="label-text-alt link link-hover"
                                >
                                    Forgot password?
                                </a>
                            </div>

                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                className="input input-bordered w-full"
                            />
                        </label>

                        <button
                            type="submit"
                            className="btn btn-primary w-full mt-2"
                            disabled={loading}
                        >
                            {loading ? <span className="loading loading-spinner loading-sm" /> : "Login"}
                        </button>

                    </form>

                    <p className="text-center text-sm text-base-content/60 mt-4">
                        Don't have an account?{" "}

                        <Link
                            to="/register"
                            className="link link-primary"
                        >
                            Register
                        </Link>

                    </p>
        </AuthShell>
    );
}
