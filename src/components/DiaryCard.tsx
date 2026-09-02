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
  isCollaborated = false,
  onEdit,
  onDelete,
}: DiaryCardProps) {
  const navigate = useNavigate()

  const diaryColor = getDiaryColor(diary.color)
  const diaryEmoji = getDiaryEmoji(diary.emoji)

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-200 group overflow-hidden">
      {/* Color header + emoji */}
      <div
        className="flex items-center justify-center py-6 relative"
        style={{
          backgroundColor: diaryColor,
        }}
      >
        {/* Use a translucent overlay instead of appending "33" to the color */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#ffffff',
            opacity: 0.8,
          }}
        />

        <span
          className="relative z-10 text-4xl leading-none select-none
                     group-hover:scale-110 transition-transform duration-200"
          role="img"
          aria-label={`${diary.title} emoji`}
        >
          {diaryEmoji}
        </span>

        {!isCollaborated && (
          <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onEdit(diary)
                }}
                className="btn btn-xs btn-ghost bg-base-100/70 hover:bg-base-100 rounded-lg"
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
                className="btn btn-xs btn-ghost bg-base-100/70 hover:bg-error hover:text-error-content rounded-lg"
                title="Delete diary"
                aria-label="Delete diary"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card-body p-4 gap-2">
        <h3 className="font-bold text-base leading-tight line-clamp-2">
          {diary.title}
        </h3>

        {isCollaborated && diary.owner && (
          <div className="flex items-center gap-1">
            <span className="badge badge-secondary badge-xs">
              collab
            </span>

            <span className="text-xs text-base-content/50">
              by {diary.owner}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-base-content/50 mt-1">
          <span aria-hidden="true">🗓️</span>
          <span>Created {formatDate(diary.createdAt)}</span>
        </div>

        <div className="card-actions mt-2">
          <button
            onClick={() => navigate(`/diary/${diary.id}/pages`)}
className="btn btn-xs btn-ghost w-full border border-base-300 hover:btn-primary transition-all"
    >
    Open Diary
</button>
</div>
</div>
</div>
)
}
