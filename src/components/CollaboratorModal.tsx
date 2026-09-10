import { useEffect, useState } from "react"
import { UserPlusIcon, TrashIcon, UsersIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { addCollaborator, getAllCollaborators, removeCollaborator } from "../api/diary"
import { errorMessage } from "../api/client"

interface Collaborator {
  id?: number
  email: string
  firstName?: string
  lastName?: string
  username?: string
}

interface CollaboratorModalProps {
  open:      boolean
  diaryId:   number
  canRemove: boolean
  onClose:   () => void
}

function normaliseCollaborator(raw: any): Collaborator {
  if (typeof raw === "string") return { email: raw }

  return {
    id:        raw.id ?? raw.userId,
    email:     raw.email ?? raw.userEmail ?? "",
    firstName: raw.firstName,
    lastName:  raw.lastName,
    username:  raw.username,
  }
}

function collaboratorName(collaborator: Collaborator) {
  const name = `${collaborator.firstName ?? ""} ${collaborator.lastName ?? ""}`.trim()
  return name || collaborator.username || collaborator.email
}

export default function CollaboratorModal({ open, diaryId, canRemove, onClose }: CollaboratorModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail]                 = useState("")
  const [loading, setLoading]             = useState(false)
  const [adding, setAdding]               = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  async function loadCollaborators() {
    setLoading(true)
    setError(null)
    try {
      const result = await getAllCollaborators(diaryId)
      setCollaborators(Array.isArray(result) ? result.map(normaliseCollaborator) : [])
    } catch (err) {
      setError(errorMessage(err, "Unable to load collaborators. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setEmail("")
    loadCollaborators()
  }, [open, diaryId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setAdding(true)
    setError(null)
    try {
      await addCollaborator(diaryId, trimmedEmail)
      setEmail("")
      await loadCollaborators()
    } catch (err) {
      setError(errorMessage(err, "Unable to add this collaborator. Please try again."))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(collaboratorEmail: string) {
    setRemovingEmail(collaboratorEmail)
    setError(null)
    try {
      console.log("[Collaborators] removing collaborator:", { diaryId, email: collaboratorEmail })
      await removeCollaborator(diaryId, collaboratorEmail)
      console.log("[Collaborators] remove request succeeded; waiting for /user/queue/notification:", {
        diaryId,
        email: collaboratorEmail,
      })
      setCollaborators(prev => prev.filter(collaborator => collaborator.email !== collaboratorEmail))
    } catch (err) {
      setError(errorMessage(err, "Unable to remove this collaborator. Please try again."))
    } finally {
      setRemovingEmail(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UsersIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base">Collaborators</h2>
              <p className="text-xs text-base-content/50">Share this diary with others.</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle shrink-0" aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="input input-bordered input-sm flex-1 min-w-0"
            disabled={adding}
            required
          />
          <button type="submit" className="btn btn-primary btn-sm gap-1" disabled={adding}>
            {adding ? <span className="loading loading-spinner loading-xs" /> : <UserPlusIcon className="w-4 h-4" />}
            Add
          </button>
        </form>

        {error && <div role="alert" className="alert alert-error py-2 px-3 text-sm">{error}</div>}

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md text-primary" /></div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-base-content/50 text-center py-6">No collaborators yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-base-200">
              {collaborators.map(collaborator => (
                <li key={collaborator.id ?? collaborator.email} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold shrink-0">
                    {collaboratorName(collaborator)[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{collaboratorName(collaborator)}</p>
                    {collaboratorName(collaborator) !== collaborator.email && (
                      <p className="text-xs text-base-content/50 truncate">{collaborator.email}</p>
                    )}
                  </div>
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(collaborator.email)}
                      className="btn btn-ghost btn-sm btn-circle text-error"
                      disabled={removingEmail === collaborator.email}
                      aria-label={`Remove ${collaboratorName(collaborator)}`}
                    >
                      {removingEmail === collaborator.email
                        ? <span className="loading loading-spinner loading-xs" />
                        : <TrashIcon className="w-4 h-4" />
                      }
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
