import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

// ── Mock data ────────────────────────────────────────────────────────────────
const mockPage = {
  id: 'p15',
  createdAt: '2026-08-29T20:00:00',
  diaryTitle: 'My Daily Thoughts',
  diaryEmoji: '📔',
}

const mockHistory = [
  { id: 'h1', user: 'You',   action: 'Created this page',   at: '2026-08-29T20:00:00' },
  { id: 'h2', user: 'You',   action: 'Edited the document', at: '2026-08-29T20:15:42' },
  { id: 'h3', user: 'Maria', action: 'Edited the document', at: '2026-08-29T20:22:10' },
  { id: 'h4', user: 'You',   action: 'Edited the document', at: '2026-08-29T21:05:33' },
  { id: 'h5', user: 'Maria', action: 'Edited the document', at: '2026-08-29T21:18:00' },
]

const mockMessages = [
  { id: 'm1', user: 'Maria', text: 'I added something at the top 💕',       at: '2026-08-29T20:23:00', self: false },
  { id: 'm2', user: 'You',   text: 'Oh I saw that, it\'s so sweet hehe',    at: '2026-08-29T20:24:30', self: true  },
  { id: 'm3', user: 'Maria', text: 'Don\'t delete it ok 🥺',                at: '2026-08-29T20:25:00', self: false },
  { id: 'm4', user: 'You',   text: 'Never! I\'ll write below yours then 😊', at: '2026-08-29T21:06:00', self: true  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatFullDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

type Panel = 'chat' | 'history' | null

// ── Component ────────────────────────────────────────────────────────────────
export default function PageView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [activePanel, setActivePanel] = useState<Panel>(
    (searchParams.get('panel') as Panel) ?? null
  )
  const [messages, setMessages] = useState(mockMessages)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to latest message whenever chat opens or messages change
  useEffect(() => {
    if (activePanel === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activePanel, messages])

  function togglePanel(panel: Panel) {
    setActivePanel(prev => prev === panel ? null : panel)
  }

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    setMessages(prev => [
      ...prev,
      {
        id: `m${Date.now()}`,
        user: 'You',
        text,
        at: new Date().toISOString(),
        self: true,
      },
    ])
    setDraft('')
  }

  const page = mockPage

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-4 gap-2">
        <button
          onClick={() => navigate(`/diary/${id}/pages`)}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Back"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-base-content/40 hidden sm:inline truncate">{page.diaryEmoji} {page.diaryTitle}</span>
          <span className="text-base-content/30 hidden sm:inline">/</span>
          <span className="font-semibold truncate">{formatFullDate(page.createdAt)}</span>
        </div>

        {/* Panel toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePanel('history')}
            className={`btn btn-sm btn-circle ${activePanel === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            aria-label="History"
            title="Edit history"
          >
            <ClockIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => togglePanel('chat')}
            className={`btn btn-sm btn-circle ${activePanel === 'chat' ? 'btn-primary' : 'btn-ghost'}`}
            aria-label="Chat"
            title="Chat"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
          </button>
          <div className="dropdown dropdown-end ml-1">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder btn-sm">
              <div className="bg-primary text-primary-content rounded-full w-8 flex items-center justify-center font-bold text-xs">
                JD
              </div>
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

        {/* ── Editor area ── */}
        <main className="flex-1 flex flex-col overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-3xl w-full flex flex-col gap-4 flex-1">

            {/* Page date heading */}
            <div className="mb-2">
              <h1 className="text-2xl font-bold">{formatFullDate(page.createdAt)}</h1>
              <p className="text-xs text-base-content/40 mt-1">Written at {formatTime(page.createdAt)}</p>
            </div>

            {/* YJS Editor placeholder */}
            <div className="flex-1 bg-base-100 rounded-2xl shadow-sm border border-base-300 min-h-[480px] flex items-center justify-center">
              <div className="text-center text-base-content/30 select-none">
                <p className="text-4xl mb-3">✏️</p>
                <p className="text-sm font-medium">YJS Editor</p>
                <p className="text-xs mt-1">Collaborative editor will live here</p>
              </div>
            </div>

          </div>
        </main>

        {/* ── Side panel ── */}
        {activePanel !== null && (
          <aside className="w-80 shrink-0 bg-base-100 border-l border-base-300 flex flex-col shadow-lg">

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <span className="font-semibold text-sm">
                {activePanel === 'chat' ? '💬 Chat' : '🕐 Edit History'}
              </span>
              <button
                onClick={() => setActivePanel(null)}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* ── History panel ── */}
            {activePanel === 'history' && (
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {mockHistory.map((entry) => (
                  <div key={entry.id} className="flex gap-3 items-start">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {entry.user[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold">{entry.user}</p>
                      <p className="text-xs text-base-content/50">{entry.action}</p>
                      <p className="text-[10px] text-base-content/30 mt-0.5">
                        {formatFullDate(entry.at)} · {formatTime(entry.at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Chat panel ── */}
            {activePanel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-0.5 ${msg.self ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-base-content/40 px-1">{msg.user}</span>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                          msg.self
                            ? 'bg-primary text-primary-content rounded-br-sm'
                            : 'bg-base-200 text-base-content rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-base-content/30 px-1">
                        {formatTime(msg.at)}
                      </span>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-3 py-3 border-t border-base-300 flex gap-2 items-end">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Say something..."
                    rows={1}
                    className="textarea textarea-bordered textarea-sm flex-1 resize-none text-sm leading-snug"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim()}
                    className="btn btn-primary btn-sm btn-circle flex-shrink-0"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

          </aside>
        )}
      </div>

      <footer className="footer footer-center p-3 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
