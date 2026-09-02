import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import ChatPopout from '../components/ChatPopout'
import { useDiarySession } from '../context/DiarySessionContext'
import { useAuth } from '../auth/AuthContext'

// ── Types ────────────────────────────────────────────────────────────────────
interface Snapshot {
  id: string
  label: string
  takenAt: string
  preview: string
}

// ── Mock data (revision history) ─────────────────────────────────────────────
const mockHistory = [
  { id: 'h1', user: 'You',   action: 'Created this page',              at: '2026-08-29T20:00:00', snapshotId: null },
  { id: 'h2', user: 'You',   action: 'Edited the document',            at: '2026-08-29T20:15:42', snapshotId: null },
  { id: 'h3', user: 'Maria', action: 'Edited the document',            at: '2026-08-29T20:22:10', snapshotId: null },
  { id: 'h4', user: 'You',   action: '📸 Saved snapshot "Before bed"', at: '2026-08-29T21:05:33', snapshotId: 's1' },
  { id: 'h5', user: 'Maria', action: 'Edited the document',            at: '2026-08-29T21:18:00', snapshotId: null },
  { id: 'h6', user: 'Maria', action: '📸 Saved snapshot "Final ver."', at: '2026-08-29T21:30:00', snapshotId: 's2' },
]

const mockSnapshots: Record<string, Snapshot> = {
  s1: {
    id: 's1', label: 'Before bed', takenAt: '2026-08-29T21:05:33',
    preview: `Today was a really good day. We went to the park and it was sunny the whole time. I got a little sunburned but it was worth it.\n\nMaria brought her camera and took so many pictures. I love how she notices little things I wouldn't even think to photograph.\n\nGoing to sleep happy tonight. 🌙`,
  },
  s2: {
    id: 's2', label: 'Final ver.', takenAt: '2026-08-29T21:30:00',
    preview: `Today was a really good day. We went to the park and it was sunny the whole time. I got a little sunburned but it was worth it.\n\nMaria brought her camera and took so many pictures. I love how she notices little things I wouldn't even think to photograph.\n\nShe added a note below mine — it made me smile so much reading it.\n\nGoing to sleep happy tonight. 🌙\n\n— M: And I'm smiling too. Today was perfect. Let's do it again soon 💕`,
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ────────────────────────────────────────────────────────────────
type Panel = 'history' | null

export default function DocumentView() {
  const { id, pageId } = useParams()
  const navigate = useNavigate()

  const { openSession, wsStatus, chatMessages, sendChat } = useDiarySession()
  const { user } = useAuth()

  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [snapshot, setSnapshot]       = useState<Snapshot | null>(null)

  // Re-open (or reuse) the session for this diary — idempotent for same diaryId
  useEffect(() => {
    if (!id) return
    openSession(Number(id))
  }, [id])

  return (
    <div className="h-screen bg-base-200 flex flex-col overflow-hidden">

      <Navbar
        left={
          <>
            <button onClick={() => navigate(`/diary/${id}/pages`)} className="btn btn-ghost btn-sm btn-circle" aria-label="Back">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="font-semibold truncate">
                {pageId ? `Document ${pageId}` : 'Document'}
              </span>
            </div>
          </>
        }
        actions={
          <button
            onClick={() => setActivePanel(p => p === 'history' ? null : 'history')}
            className={`btn btn-sm btn-circle ${activePanel === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            title="History"
          >
            <ClockIcon className="w-4 h-4" />
          </button>
        }
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col gap-6">

            {/* ── YJS Editor area ── */}
            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300">
              <div className="px-4 py-2.5 border-b border-base-300">
                <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wide">✏️ Editor</span>
              </div>
              <div className="min-h-96 flex items-center justify-center text-base-content/20 select-none p-8">
                <div className="text-center">
                  <p className="text-3xl mb-2">✏️</p>
                  <p className="text-sm font-medium">YJS collaborative editor</p>
                  <p className="text-xs mt-1">Mount your editor here</p>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* ── History side panel ── */}
        {activePanel === 'history' && (
          <aside className="w-72 shrink-0 bg-base-100 border-l border-base-300 flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 shrink-0">
              <span className="font-semibold text-sm">🕐 Edit History</span>
              <button onClick={() => setActivePanel(null)} className="btn btn-ghost btn-xs btn-circle">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              <p className="text-xs text-base-content/40 mb-1">Click a snapshot to preview it.</p>
              {mockHistory.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => entry.snapshotId && setSnapshot(mockSnapshots[entry.snapshotId])}
                  className={`flex gap-3 items-start p-2 rounded-xl transition-colors ${
                    entry.snapshotId
                      ? 'cursor-pointer hover:bg-primary/10 border border-transparent hover:border-primary/20'
                      : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {entry.user[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{entry.user}</p>
                    <p className="text-xs text-base-content/50">{entry.action}</p>
                    <p className="text-[10px] text-base-content/30 mt-0.5">{formatTime(entry.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ── Floating chat popout ── */}
      <ChatPopout
        messages={chatMessages}
        wsStatus={wsStatus}
        currentUserId={user?.id}
        onSend={(text) => sendChat(0, Number(pageId ?? 0), text)}
      />

      {/* ── Snapshot preview modal ── */}
      {snapshot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSnapshot(null)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <div>
                <p className="font-bold">📸 {snapshot.label}</p>
                <p className="text-xs text-base-content/40 mt-0.5">Snapshot at {formatTime(snapshot.takenAt)}</p>
              </div>
              <button onClick={() => setSnapshot(null)} className="btn btn-ghost btn-sm btn-circle">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm text-base-content/80 leading-relaxed">
                {snapshot.preview}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
