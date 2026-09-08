import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { login as loginApi } from "../api/login";
import { useAuth } from "../auth/AuthContext";

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
            setError("Invalid username or password. Please try again.");

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200 px-4">
            <div className="card w-full max-w-sm bg-base-100 shadow-xl">
                <div className="card-body">

                    <Link
                        to="/"
                        className="link link-primary"
                        aria-label="Go to CoLog home"
                    >
                        Back to Homepage
                    </Link>

                    <h2 className="text-2xl font-bold text-center text-primary mb-1">
                        Welcome back
                    </h2>

                    <p className="text-center text-base-content/60 text-sm mb-4">
                        Login to your CoLog account
                    </p>

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

                </div>
            </div>
        </div>
    );
}
