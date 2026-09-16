import { useState, type FormEvent } from "react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register, verify, type RegisterPayload } from "../api/register";
import { useAuth } from "../auth/AuthContext";
import { checkIfUsernameExists } from "../api/user";
import { errorMessage } from "../api/client";
import AuthShell from "../components/AuthShell";

type Step = "details" | "verify";
const initialForm: RegisterPayload = { firstName: "", lastName: "", username: "", email: "", password: "" };

export default function Register() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>("details");
    const [form, setForm] = useState<RegisterPayload>(initialForm);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [usernameChecking, setUsernameChecking] = useState(false);
    const [usernameExists, setUsernameExists] = useState<boolean | null>(null);

    if (isAuthenticated) return <Navigate to="/diary" replace />;
    const update = (field: keyof RegisterPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (field === "username") setUsernameExists(null);
        setForm(current => ({ ...current, [field]: event.target.value }));
    };

    async function validateUsername(): Promise<boolean> {
        const username = form.username.trim();
        if (!username) return false;

        setUsernameChecking(true);
        try {
            const exists = await checkIfUsernameExists(username);
            setUsernameExists(exists);
            if (exists) setError("That username already exists. Please choose another one.");
            return !exists;
        } catch (err) {
            setUsernameExists(null);
            setError(errorMessage(err, "We couldn't check that username. Please try again."));
            return false;
        } finally {
            setUsernameChecking(false);
        }
    }

    async function submitRegistration(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setError(null); setNotice(null);
        if (form.password.length < 8) return setError("Your password must be at least 8 characters.");
        if (new FormData(event.currentTarget).get("confirmPassword") !== form.password) return setError("Passwords do not match.");
        if (!(await validateUsername())) {
            return;
        }
        setLoading(true);
        try {
            const result = await register(form);
            setForm(current => ({ ...current, email: result.email || current.email }));
            setStep("verify"); setNotice("We sent a verification code to your email address. ");
        } catch (err) { setError(errorMessage(err, "Unable to create your account. Please try again.")); }
        finally { setLoading(false); }
    }

    async function submitVerification(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setError(null); setNotice(null);
        if (!code.trim()) return setError("Enter the verification code from your email.");
        setLoading(true);
        try { await verify(form.email, code.trim()); navigate("/login", { replace: true, state: { registeredUsername: form.username } }); }
        catch (err) { setError(errorMessage(err, "Unable to verify that code. Please try again.")); }
        finally { setLoading(false); }
    }

    async function resendCode() {
        setError(null); setNotice(null); setLoading(true);
        try { await register(form); setNotice("A new verification code has been sent."); }
        catch (err) { setError(errorMessage(err, "Unable to resend the verification code.")); }
        finally { setLoading(false); }
    }

    return <AuthShell eyebrow={step === "details" ? "Join CoLog" : "One last step"} title={step === "details" ? "Make it yours." : "Check your email."} description={step === "details" ? "Create your account and start writing together." : `Enter the code we sent to ${form.email}.`}>
        {step === "details" ? <>
            <form className="flex flex-col gap-3" onSubmit={submitRegistration}>
                {error && <Alert message={error} />}
                <Field label="First name" value={form.firstName} onChange={update("firstName")} autoComplete="given-name" />
                <Field label="Last name" value={form.lastName} onChange={update("lastName")} autoComplete="family-name" />
                <Field label="Username" value={form.username} onChange={update("username")} onBlur={validateUsername} autoComplete="username" hint={usernameChecking ? "Checking…" : usernameExists === true ? "Username already exists" : usernameExists === false ? "Username is available" : undefined} error={usernameExists === true} />
                <Field label="Email" type="email" value={form.email} onChange={update("email")} autoComplete="email" />
                <Field label="Password" type="password" value={form.password} onChange={update("password")} autoComplete="new-password" hint="At least 8 characters" />
                <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" />
                <button type="submit" className="btn btn-primary mt-2 w-full" disabled={loading}>{loading ? <span className="loading loading-spinner loading-sm" /> : "Create account"}</button>
            </form>
            <p className="mt-4 text-center text-sm text-base-content/60">Already have an account? <Link to="/login" className="link link-primary">Log in</Link></p>
        </> : <>
            <CheckCircleIcon className="mx-auto h-12 w-12 text-success" />
            <form className="flex flex-col gap-4" onSubmit={submitVerification}>
                {error && <Alert message={error} />}{notice && <div role="status" className="alert alert-success py-2.5 px-3.5 text-sm"><span>{notice}</span></div>}
                <label className="form-control w-full"><div className="label"><span className="label-text">Verification code</span></div><input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} placeholder="Enter your code" className="input input-bordered w-full text-center tracking-[0.25em]" /></label>
                <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? <span className="loading loading-spinner loading-sm" /> : "Verify email"}</button>
            </form>
            <div className="mt-4 text-center text-sm text-base-content/60">Didn't receive it? <button type="button" className="link link-primary" onClick={resendCode} disabled={loading}>Resend code</button><button type="button" className="btn btn-ghost btn-sm mt-2 w-full" onClick={() => { setStep("details"); setError(null); setNotice(null); }}>Use a different email</button></div>
        </>}</AuthShell>;
}

function Alert({ message }: { message: string }) { return <div role="alert" className="alert alert-error py-2.5 px-3.5 text-sm"><ExclamationCircleIcon className="h-5 w-5 shrink-0" /><span>{message}</span></div>; }
function Field({ label, type = "text", value, onChange, onBlur, name, autoComplete, hint, error = false }: { label: string; type?: string; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; onBlur?: React.FocusEventHandler<HTMLInputElement>; name?: string; autoComplete?: string; hint?: string; error?: boolean; }) {
    return <label className="form-control w-full"><div className="label"><span className="label-text">{label}</span>{hint && <span className={`label-text-alt ${error ? "text-error" : ""}`}>{hint}</span>}</div><input required name={name} type={type} value={value} onChange={onChange} onBlur={onBlur} autoComplete={autoComplete} className={`input input-bordered w-full ${error ? "input-error" : ""}`} /></label>;
}
