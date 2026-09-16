import { useNavigate } from 'react-router-dom'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

/**
 * Backend color names -> actual CSS colors.
 */
const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
}

const DEFAULT_COLOR = '#e5e7eb'

/**
 * Supports:
 * - "blue"
 * - " Blue "
 * - "#3b82f6"
 * - "rgb(...)"
 * - "rgba(...)"
 */
function getDiaryColor(color?: string): string {
  if (!color) return DEFAULT_COLOR

  const value = color.trim().toLowerCase()

  // Already a hex color
  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return value
  }

  // Other valid CSS color formats
  if (
    value.startsWith('rgb(') ||
    value.startsWith('rgba(') ||
    value.startsWith('hsl(') ||
    value.startsWith('hsla(')
  ) {
    return value
  }

  return COLOR_MAP[value] ?? DEFAULT_COLOR
}

/**
 * Makes sure emoji coming from the backend is rendered cleanly.
 */
function getDiaryEmoji(emoji?: string): string {
  if (!emoji) return '📔'

  const value = emoji.trim()

  // Handle JSON-stringified emoji, e.g. "\"😊\""
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'string' && parsed.trim()) {
        return parsed.trim()
      }
    } catch {
      // Fall through and use the original value.
    }
  }

  return value || '📔'
}

interface Diary {
  id: string
  title: string
  createdAt: string
  emoji: string
  color: string
  owner?: string
}

interface DiaryCardProps {
  diary: Diary
  index?: number
  isCollaborated?: boolean
  onEdit?: (diary: Diary) => void
  onDelete?: (diary: Diary) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DiaryCard({
  diary,
  index = 0,
  isCollaborated = false,
  onEdit,
  onDelete,
}: DiaryCardProps) {
  const navigate = useNavigate()

  const diaryColor = getDiaryColor(diary.color)
  const diaryEmoji = getDiaryEmoji(diary.emoji)

  return (
    <div className="diary-card diary-card-marshmallow card relative overflow-hidden border-0 bg-base-100 shadow-sm transition-all duration-200 hover:-translate-y-1" style={{ animationDelay: `${index * 60}ms` }}>
      <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20" style={{ backgroundColor: diaryColor }} />
      <span className="absolute -bottom-14 -left-10 h-28 w-28 rounded-full opacity-10" style={{ backgroundColor: diaryColor }} />
      <div className="card-body relative gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.3rem] bg-base-200 text-2xl shadow-[0_5px_14px_oklch(var(--bc)/.08)]" role="img" aria-label={`${diary.title} emoji`}>{diaryEmoji}</span>
            <div className="min-w-0"><h3 className="truncate text-lg font-black tracking-[-0.025em]">{diary.title}</h3><p className="mt-1 text-xs text-base-content/50">{formatDate(diary.createdAt)}</p></div>
          </div>
          {!isCollaborated && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onEdit(diary)
                }}
                className="btn btn-xs btn-ghost btn-circle"
                title="Edit diary"
                aria-label="Edit diary"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDelete(diary)
                }}
                className="btn btn-xs btn-ghost btn-circle text-base-content/45 hover:text-error"
                title="Delete diary"
                aria-label="Delete diary"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>)}
        </div>

        {isCollaborated && diary.owner && (
          <div className="flex items-center gap-2 rounded-2xl bg-base-200/75 px-3 py-2 text-xs"><span className="badge badge-secondary badge-xs">shared</span><span className="text-base-content/60">by {diary.owner}</span></div>
        )}

        <div className="card-actions mt-auto pt-1">
          <button
            onClick={() => navigate(`/diary/${diary.id}/pages`, {
              state: { isOwner: !isCollaborated },
            })}
            className="btn btn-sm btn-ghost w-full border-0 bg-base-200/80 hover:btn-primary"
          >Open diary</button>
        </div>
      </div>
    </div>
  )
}
