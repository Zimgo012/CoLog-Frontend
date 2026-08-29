import { useNavigate } from 'react-router-dom'

interface Diary {
  id: string
  title: string
  createdAt: string
  lastOpenedAt: string
  emoji: string
  color: string
  owner?: string
}

interface DiaryCardProps {
  diary: Diary
  isCollaborated?: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DiaryCard({ diary, isCollaborated = false }: DiaryCardProps) {
  const navigate = useNavigate()
  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
      {/* Color strip + emoji */}
      <div className={`${diary.color} rounded-t-2xl flex items-center justify-center py-6`}>
        <span className="text-4xl group-hover:scale-110 transition-transform duration-200">
          {diary.emoji}
        </span>
      </div>

      <div className="card-body p-4 gap-2">
        {/* Title */}
        <h3 className="font-bold text-base leading-tight line-clamp-2">{diary.title}</h3>

        {/* Collaborated badge */}
        {isCollaborated && diary.owner && (
          <div className="flex items-center gap-1">
            <span className="badge badge-secondary badge-xs">collab</span>
            <span className="text-xs text-base-content/50">by {diary.owner}</span>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-1 text-xs text-base-content/50">
            <span>🗓️</span>
            <span>Created {formatDate(diary.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-base-content/50">
            <span>🕐</span>
            <span>Opened {formatDate(diary.lastOpenedAt)}</span>
          </div>
        </div>

        {/* Open button */}
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
