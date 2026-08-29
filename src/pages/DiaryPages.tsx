import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { useDiaryChat } from '../context/DiaryChatContext'

// ── Mock data ────────────────────────────────────────────────────────────────
const mockDiary = {
  id: '1',
  title: 'My Daily Thoughts',
  emoji: '📔',
  isOwner: true,
}

const mockPages = [
  { id: 'p1',  createdAt: '2024-03-10T08:30:00' },
  { id: 'p2',  createdAt: '2024-01-02T09:15:00' },
  { id: 'p3',  createdAt: '2024-06-18T07:45:00' },
  { id: 'p4',  createdAt: '2024-11-05T21:00:00' },
  { id: 'p5',  createdAt: '2024-12-31T02:13:00' },
  { id: 'p6',  createdAt: '2025-01-01T00:05:00' },
  { id: 'p7',  createdAt: '2025-04-12T10:00:00' },
  { id: 'p8',  createdAt: '2025-07-01T18:30:00' },
  { id: 'p9',  createdAt: '2025-10-20T16:00:00' },
  { id: 'p10', createdAt: '2025-12-30T22:00:00' },
  { id: 'p11', createdAt: '2026-01-03T08:00:00' },
  { id: 'p12', createdAt: '2026-03-15T09:45:00' },
  { id: 'p13', createdAt: '2026-05-28T14:00:00' },
  { id: 'p14', createdAt: '2026-08-10T23:50:00' },
  { id: 'p15', createdAt: '2026-08-29T20:00:00' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getYear(d: string)  { return new Date(d).getFullYear() }
function getMonth(d: string) { return new Date(d).getMonth() }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DiaryPages() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getMessages, sendMessage } = useDiaryChat()

  const diary = mockDiary
  const diaryId = id ?? diary.id

  const allPages = [...mockPages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const years = [...new Set(allPages.map(p => getYear(p.createdAt)))].sort((a, b) => b - a)

  const [selectedYear, setSelectedYear]   = useState<number>(years[0])
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [chatOpen, setChatOpen]           = useState(false)
  const [draft, setDraft]                 = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = getMessages(diaryId)

  const activeMonths = [...new Set(
    allPages.filter(p => getYear(p.createdAt) === selectedYear).map(p => getMonth(p.createdAt))
  )].sort((a, b) => a - b)

  function handleYearChange(year: number) {
    setSelectedYear(year)
    setSelectedMonth(null)
  }

  const filtered = allPages.filter(p => {
    if (getYear(p.createdAt) !== selectedYear) return false
    if (selectedMonth !== null && getMonth(p.createdAt) !== selectedMonth) return false
    return true
  })

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatOpen, messages])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    sendMessage(diaryId, text)
    setDraft('')
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-6">
        <div className="flex-1 flex items-center gap-3">
          <button onClick={() => navigate('/diary')} className="btn btn-ghost btn-sm btn-circle" aria-label="Back">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-xl font-extrabold text-primary">CoLog</span>
        </div>
        <div className="flex-none flex items-center gap-2">
          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className={`btn btn-sm gap-1.5 ${chatOpen ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Chat</span>
            {messages.length > 0 && (
              <span className="badge badge-xs badge-secondary">{messages.length}</span>
            )}
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-9 flex items-center justify-center font-bold text-sm">JD</div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48">
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a className="text-error">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Body — list + optional chat drawer */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main list */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-10 max-w-3xl">

            {/* Diary header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{diary.emoji}</span>
                <div>
                  <h1 className="text-2xl font-bold leading-tight">{diary.title}</h1>
                  <p className="text-base-content/40 text-xs mt-0.5">
                    {allPages.length} {allPages.length === 1 ? 'entry' : 'entries'} total
                  </p>
                </div>
              </div>
              {diary.isOwner && (
                <button className="btn btn-primary btn-sm gap-1">
                  <PlusIcon className="w-4 h-4" />
                  New Page
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="bg-base-100 rounded-2xl p-4 mb-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-base-content/40 w-12">Year</span>
                <div className="flex gap-1.5 flex-wrap">
                  {years.map(year => (
                    <button key={year} onClick={() => handleYearChange(year)}
                      className={`btn btn-xs rounded-full px-3 transition-all ${selectedYear === year ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divider my-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-base-content/40 w-12">Month</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setSelectedMonth(null)}
                    className={`btn btn-xs rounded-full px-3 transition-all ${selectedMonth === null ? 'btn-secondary' : 'btn-ghost border border-base-300'}`}>
                    All
                  </button>
                  {MONTHS.map((name, idx) => {
                    const has = activeMonths.includes(idx)
                    return (
                      <button key={name} onClick={() => has && setSelectedMonth(idx)} disabled={!has}
                        className={`btn btn-xs rounded-full px-3 transition-all ${selectedMonth === idx ? 'btn-secondary' : has ? 'btn-ghost border border-base-300' : 'btn-ghost opacity-25 cursor-not-allowed'}`}>
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <p className="text-xs text-base-content/40 mb-3 px-1">
              Showing {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              {selectedMonth !== null ? ` · ${MONTHS[selectedMonth]} ${selectedYear}` : ` · ${selectedYear}`}
            </p>

            {/* Page list */}
            {filtered.length === 0 ? (
              <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
                <div className="card-body items-center text-center py-16">
                  <span className="text-4xl">🗂️</span>
                  <p className="text-base-content/40 mt-2">No entries for this period.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((page, index) => (
                  <div key={page.id} onClick={() => navigate(`/diary/${id}/pages/${page.id}`)}
                    className="card bg-base-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                    <div className="card-body flex-row items-center gap-4 py-4 px-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/40 group-hover:bg-primary group-hover:text-primary-content transition-colors duration-200">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{formatDate(page.createdAt)}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{formatTime(page.createdAt)}</p>
                      </div>
                      <DocumentTextIcon className="w-4 h-4 text-base-content/20 group-hover:text-primary flex-shrink-0 transition-colors duration-200" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Persistent chat drawer */}
        {chatOpen && (
          <aside className="w-80 shrink-0 bg-base-100 border-l border-base-300 flex flex-col shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <div>
                <p className="font-semibold text-sm">💬 Diary Chat</p>
                <p className="text-[10px] text-base-content/40">{diary.emoji} {diary.title}</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="btn btn-ghost btn-xs btn-circle">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.self ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-base-content/40 px-1">{msg.user}</span>
                  <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${msg.self ? 'bg-primary text-primary-content rounded-br-sm' : 'bg-base-200 text-base-content rounded-bl-sm'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-base-content/30 px-1">{formatTime(msg.at)}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="px-3 py-3 border-t border-base-300 flex gap-2 items-end">
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
          </aside>
        )}
      </div>

      <footer className="footer footer-center p-4 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
