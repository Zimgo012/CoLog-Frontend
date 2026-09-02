import { useState } from "react"
import { XMarkIcon, PencilIcon, CheckIcon } from "@heroicons/react/24/outline"
import { useAuth } from "../auth/AuthContext"
import { updateUser } from "../api/user"

interface ProfileModalProps {
    open:    boolean
    onClose: () => void
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
    const { user, updateUser: saveUser } = useAuth()

    const [editing, setEditing]   = useState(false)
    const [saving, setSaving]     = useState(false)
    const [error, setError]       = useState<string | null>(null)

    const [firstName, setFirstName] = useState(user?.firstName ?? "")
    const [lastName,  setLastName]  = useState(user?.lastName  ?? "")
    const [email,     setEmail]     = useState(user?.email     ?? "")
    const [password,  setPassword]  = useState("")

    if (!open) return null

    function startEdit() {
        // Reset fields to current stored values each time edit is opened
        setFirstName(user?.firstName ?? "")
        setLastName(user?.lastName   ?? "")
        setEmail(user?.email         ?? "")
        setPassword("")
        setError(null)
        setEditing(true)
    }

    function cancelEdit() {
        setEditing(false)
        setError(null)
    }

    async function handleSave() {
        setSaving(true)
        setError(null)
        try {
            const payload: Record<string, string> = {}
            if (firstName !== user?.firstName) payload.firstName = firstName
            if (lastName  !== user?.lastName)  payload.lastName  = lastName
            if (email     !== user?.email)     payload.email     = email
            if (password)                      payload.password  = password

            if (Object.keys(payload).length === 0) {
                setEditing(false)
                return
            }

            const updated = await updateUser(user!.id, payload);
            saveUser(updated)
            setEditing(false)
        } catch {
            setError("Failed to update profile. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    // Initials for avatar
    const initials = user
        ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
        : "?"

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
             onClick={onClose}>
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">
                        {editing ? "Edit Profile" : "Profile"}
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Avatar + username */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center text-xl font-bold shrink-0">
                        {initials}
                    </div>
                    <div>
                        <p className="font-semibold text-base">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm text-base-content/50">@{user?.username}</p>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="alert alert-error py-2 px-3 text-sm">{error}</div>
                )}

                {/* View mode */}
                {!editing && (
                    <div className="flex flex-col gap-3">
                        <Field label="First name" value={user?.firstName ?? "—"} />
                        <Field label="Last name"  value={user?.lastName  ?? "—"} />
                        <Field label="Email"      value={user?.email     ?? "—"} />
                        <Field label="Username"   value={user?.username  ?? "—"} />

                        <button onClick={startEdit} className="btn btn-primary btn-sm gap-1.5 mt-1 self-end">
                            <PencilIcon className="w-4 h-4" />
                            Edit Profile
                        </button>
                    </div>
                )}

                {/* Edit mode */}
                {editing && (
                    <div className="flex flex-col gap-3">

                        <label className="form-control w-full">
                            <div className="label py-0.5">
                                <span className="label-text text-xs">First Name</span>
                            </div>
                            <input
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                className="input input-bordered input-sm w-full"
                            />
                        </label>

                        <label className="form-control w-full">
                            <div className="label py-0.5">
                                <span className="label-text text-xs">Last Name</span>
                            </div>
                            <input
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                className="input input-bordered input-sm w-full"
                            />
                        </label>

                        <label className="form-control w-full">
                            <div className="label py-0.5">
                                <span className="label-text text-xs">Email</span>
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="input input-bordered input-sm w-full"
                            />
                        </label>

                        <label className="form-control w-full">
                            <div className="label py-0.5">
                                <span className="label-text text-xs">New Password</span>
                                <span className="label-text-alt text-xs opacity-50">leave blank to keep current</span>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input input-bordered input-sm w-full"
                            />
                        </label>

                        <div className="flex gap-2 justify-end mt-1">
                            <button onClick={cancelEdit} className="btn btn-ghost btn-sm" disabled={saving}>
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn btn-primary btn-sm gap-1.5" disabled={saving}>
                                {saving
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : <CheckIcon className="w-4 h-4" />
                                }
                                Save
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

// ── Small helper ──────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-base-200 last:border-0">
            <span className="text-xs text-base-content/50 w-24 shrink-0">{label}</span>
            <span className="text-sm font-medium text-right truncate">{value}</span>
        </div>
    )
}
