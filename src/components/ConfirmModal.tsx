import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface ConfirmModalProps {
  open:        boolean
  title:       string
  description: string
  confirmLabel?: string
  loading?:    boolean
  error?:      string | null
  onClose:     () => void
  onConfirm:   () => void
}

export default function ConfirmModal({
  open, title, description, confirmLabel = "Delete", loading = false, error, onClose, onConfirm,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </span>
            <h2 className="font-bold text-base">{title}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle shrink-0">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-base-content/60">{description}</p>

        {error && <div role="alert" className="alert alert-error py-2.5 px-3 text-sm">{error}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-error btn-sm" disabled={loading}>
            {loading
              ? <span className="loading loading-spinner loading-xs" />
              : confirmLabel
            }
          </button>
        </div>
      </div>
    </div>
  )
}
