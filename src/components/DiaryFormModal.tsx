import { useState, useEffect } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"

// ── Emoji palette ─────────────────────────────────────────────────────────────
const EMOJIS = [
  "📔","📒","📓","📕","📗","📘","📙","📖",
  "✏️","🖊️","🖋️","📝","🗒️","🗓️","📅","📆",
  "💭","💡","🌟","⭐","🔥","❤️","🌈","🎯",
  "🌸","🍀","🌙","☀️","🌊","🏔️","🎵","🎨",
]

// ── Color palette — keys match what the backend stores ────────────────────────
export const DIARY_COLORS = [
  { key: "blue",   hex: "#3b82f6", label: "Blue"   },
  { key: "purple", hex: "#a855f7", label: "Purple" },
  { key: "pink",   hex: "#ec4899", label: "Pink"   },
  { key: "red",    hex: "#ef4444", label: "Red"    },
  { key: "orange", hex: "#f97316", label: "Orange" },
  { key: "yellow", hex: "#eab308", label: "Yellow" },
  { key: "green",  hex: "#22c55e", label: "Green"  },
  { key: "teal",   hex: "#14b8a6", label: "Teal"   },
]

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DiaryFormValues {
  title: string
  emoji: string
  color: string
}

interface DiaryFormModalProps {
  open:      boolean
  mode:      "add" | "edit"
  initial?:  Partial<DiaryFormValues>
  saving?:   boolean
  onClose:   () => void
  onSubmit:  (values: DiaryFormValues) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DiaryFormModal({
  open, mode, initial, saving = false, onClose, onSubmit,
}: DiaryFormModalProps) {

  const [title, setTitle] = useState("")
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [color, setColor] = useState(DIARY_COLORS[0].key)

  const VALID_COLOR_KEYS = DIARY_COLORS.map(c => c.key)

  useEffect(() => {
    if (!open) return

    let initEmoji = initial?.emoji ?? ""
    let initColor = initial?.color ?? ""

    // Guard against swapped values from backend
    const emojiIsColorKey = VALID_COLOR_KEYS.includes(initEmoji)
    const colorIsEmoji    = initColor.length > 0 && !VALID_COLOR_KEYS.includes(initColor)
    if (emojiIsColorKey && colorIsEmoji) {
      ;[initEmoji, initColor] = [initColor, initEmoji]
    }

    setTitle(initial?.title ?? "")
    setEmoji(EMOJIS.includes(initEmoji) ? initEmoji : EMOJIS[0])
    setColor(VALID_COLOR_KEYS.includes(initColor) ? initColor : DIARY_COLORS[0].key)
  }, [open, initial?.title, initial?.emoji, initial?.color])

  if (!open) return null

  const activeHex = DIARY_COLORS.find(c => c.key === color)?.hex ?? DIARY_COLORS[0].hex

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), emoji, color })
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold">
            {mode === "add" ? "New Diary" : "Edit Diary"}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pb-6 pt-2">

          {/* Preview strip — hex + alpha via inline style */}
          <div
            className="rounded-xl flex items-center justify-center py-6"
            style={{ backgroundColor: activeHex + "33" }}
          >
            <span className="text-5xl">{emoji}</span>
          </div>

          {/* Title */}
          <label className="form-control w-full">
            <div className="label py-0.5">
              <span className="label-text text-xs font-semibold">Title</span>
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My diary..."
              className="input input-bordered w-full"
              required
            />
          </label>

          {/* Emoji picker */}
          <div>
            <p className="text-xs font-semibold text-base-content/60 mb-2">Emoji</p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-lg transition-all hover:bg-base-200 ${
                    emoji === e ? "ring-2 ring-primary bg-primary/10" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker — plain hex circles, no Tailwind dynamic classes */}
          <div>
            <p className="text-xs font-semibold text-base-content/60 mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {DIARY_COLORS.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  title={c.label}
                  style={{ backgroundColor: c.hex }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c.key
                      ? "border-base-content scale-110"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim()}>
              {saving
                ? <span className="loading loading-spinner loading-xs" />
                : mode === "add" ? "Create" : "Save"
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
