import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CameraIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { useDiaryChat } from '../context/DiaryChatContext'
import DraggableSticky, { StickyImage, randomRotation } from '../components/DraggableSticky'

// ── Types ────────────────────────────────────────────────────────────────────
interface Snapshot {
  id: string
  label: string
  takenAt: string
  preview: string
}

// ── Mock data ────────────────────────────────────────────────────────────────
const mockPage = {
  id: 'p15',
  createdAt: '2026-08-29T20:00:00',
  diaryId: '1',
  diaryTitle: 'My Daily Thoughts',
  diaryEmoji: '📔',
}

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

const INITIAL_STICKIES: StickyImage[] = [
  { id: 'si1', src: 'https://placehold.co/200x150/fce4ec/c2185b?text=📸', x: 80,  y: 160, rotation: -3 },
  { id: 'si2', src: 'https://placehold.co/200x150/f3e5f5/7b1fa2?text=📸', x: 320, y: 220, rotation: 2  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
// ── Helpers ──────────────────────────────────────────────────────────────────
function formatFullDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ────────────────────────────────────────────────────────────────
type Panel = 'history' | null

export default function PageView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getMessages, sendMessage } = useDiaryChat()

  const page     = mockPage
  const diaryId  = id ?? page.diaryId
  const messages = getMessages(diaryId)

  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [chatOpen, setChatOpen]       = useState(searchParams.get('panel') === 'chat')
  const [draft, setDraft]             = useState('')
  const [stickies, setStickies]       = useState<StickyImage[]>(INITIAL_STICKIES)
  const [snapshot, setSnapshot]       = useState<Snapshot | null>(null)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatOpen, messages])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    sendMessage(diaryId, text)
    setDraft('')
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = 5 - stickies.length
    files.slice(0, remaining).forEach((file, i) => {
      const src = URL.createObjectURL(file)
      setStickies(prev => [...prev, {
        id: `si${Date.now()}-${i}`,
        src,
        x: 100 + Math.random() * (window.innerWidth - 300),
        y: 100 + Math.random() * (window.innerHeight - 300),
        rotation: randomRotation(),
      }])
    })
    e.target.value = ''
  }

  const moveSticky = useCallback((stickyId: string, x: number, y: number) => {
    setStickies(prev => prev.map(s => s.id === stickyId ? { ...s, x, y } : s))
  }, [])

  const removeSticky = useCallback((stickyId: string) => {
    setStickies(prev => prev.filter(s => s.id !== stickyId))
  }, [])

  return (
    <div className="h-screen bg-base-200 flex flex-col overflow-hidden">

      {/* ── Stickies — fixed over the entire viewport ── */}
      {stickies.map(s => (
        <DraggableSticky key={s.id} sticky={s} onMove={moveSticky} onRemove={removeSticky} />
      ))}

      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-4 gap-2 shrink-0 relative z-50">
        <button onClick={() => navigate(`/diary/${id}/pages`)} className="btn btn-ghost btn-sm btn-circle" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-base-content/40 hidden sm:inline">{page.diaryEmoji} {page.diaryTitle}</span>
          <span className="text-base-content/30 hidden sm:inline">/</span>
          <span className="font-semibold truncate">{formatFullDate(page.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActivePanel(p => p === 'history' ? null : 'history')}
            className={`btn btn-sm btn-circle ${activePanel === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            title="History"
          >
            <ClockIcon className="w-4 h-4" />
          </button>
          {stickies.length < 5 ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost btn-sm gap-1.5"
                title="Add photo sticky"
              >
                <CameraIcon className="w-4 h-4" />
                {stickies.length > 0 && <span className="badge badge-xs">{stickies.length}/5</span>}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </>
          ) : (
            <div className="flex items-center gap-1 px-2 text-base-content/40">
              <PhotoIcon className="w-4 h-4" />
              <span className="badge badge-xs">5/5</span>
            </div>
          )}
          <div className="dropdown dropdown-end ml-1">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder btn-sm">
              <div className="bg-primary text-primary-content rounded-full w-8 flex items-center justify-center font-bold text-xs">JD</div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48">
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a className="text-error">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col gap-6">

            <div>
              <h1 className="text-2xl font-bold">{formatFullDate(page.createdAt)}</h1>
              <p className="text-xs text-base-content/40 mt-1">Written at {formatTime(page.createdAt)}</p>
              {stickies.length > 0 && (
                <p className="text-xs text-base-content/30 mt-0.5">
                  📌 {stickies.length} photo{stickies.length > 1 ? 's' : ''} pinned — drag them anywhere
                </p>
              )}
            </div>

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

      {/* ── Chat tab (vertical pill on right edge) ── */}
      <button
        onClick={() => setChatOpen(o => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 py-4 px-2 bg-base-100 border border-r-0 border-base-300 rounded-l-2xl shadow-md hover:bg-base-200 transition-colors"
        aria-label="Toggle chat"
      >
        <ChatBubbleLeftRightIcon className={`w-5 h-5 ${chatOpen ? 'text-primary' : 'text-base-content/50'}`} />
        {messages.length > 0 && (
          <span className="badge badge-xs badge-secondary">{messages.length}</span>
        )}
        <span className="text-[10px] font-semibold text-base-content/40 uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>
          Chat
        </span>
      </button>

      {/* ── Chat drawer ── */}
      <div
        className={`fixed top-0 right-0 h-full z-20 flex flex-col bg-base-100 border-l border-base-300 shadow-2xl transition-transform duration-300 ease-in-out ${
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 320 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 shrink-0 mt-14">
          <div>
            <p className="font-semibold text-sm">💬 Diary Chat</p>
            <p className="text-[10px] text-base-content/40">{page.diaryEmoji} {page.diaryTitle}</p>
          </div>
          <button onClick={() => setChatOpen(false)} className="btn btn-ghost btn-xs btn-circle">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.self ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-base-content/40 px-1">{msg.user}</span>
              <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                msg.self
                  ? 'bg-primary text-primary-content rounded-br-sm'
                  : 'bg-base-200 text-base-content rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-base-content/30 px-1">{formatTime(msg.at)}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="px-3 py-3 border-t border-base-300 flex gap-2 items-end shrink-0">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Say something..."
            rows={1}
            className="textarea textarea-bordered textarea-sm flex-1 resize-none text-sm leading-snug"
          />
          <button onClick={handleSend} disabled={!draft.trim()} className="btn btn-primary btn-sm btn-circle flex-shrink-0">
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      {chatOpen && (
        <div className="fixed inset-0 z-10 bg-black/20 sm:hidden" onClick={() => setChatOpen(false)} />
      )}

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
