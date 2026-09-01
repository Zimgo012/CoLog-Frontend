import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import { getDiary } from '../api/diary'
import { getDocuments, type Document } from '../api/document'
import { useDiarySession } from '../context/DiarySessionContext'

// ── Helpers ──────────────────────────────────────────────────────────────────
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

  const { openSession, wsStatus, chatMessages, sendChat } = useDiarySession()

  const [diaryTitle, setDiaryTitle] = useState('')
  const [documents, setDocuments]   = useState<Document[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [chatOpen, setChatOpen] = useState(false)
  const [draft, setDraft]       = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)

  // ── Open session on mount ────────────────────────────────────────────────
  // Do NOT close on unmount here — DocumentView keeps the same session alive.
  // closeSession is called by DocumentView when the user leaves the diary entirely.
  useEffect(() => {
    if (!id) return
    openSession(Number(id))
  }, [id])

  // ── Fetch diary + documents ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const numId = Number(id)
    setLoading(true)
    setError(null)

    Promise.all([getDiary(numId), getDocuments(numId)])
      .then(([diary, docs]) => {
        setDiaryTitle(diary.title)
        setDocuments([...docs].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ))
      })
      .catch(() => setError('Failed to load diary.'))
      .finally(() => setLoading(false))
  }, [id])

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatOpen, chatMessages])

  // ── Send chat ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    // senderId 0, documentId 0 — swap for real IDs when available
    sendChat(0, 0, text)
    setDraft('')
  }, [draft, sendChat])

  // ── Shared nav left slot ──────────────────────────────────────────────────
  const navLeft = (
    <>
      <button onClick={() => navigate('/diary')} className="btn btn-ghost btn-sm btn-circle" aria-label="Back">
        <ArrowLeftIcon className="w-5 h-5" />
      </button>
      <span className="text-xl font-extrabold text-primary">CoLog</span>
    </>
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col">
        <Navbar left={navLeft} />
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex flex-col">
        <Navbar left={navLeft} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">😕</span>
          <p className="text-base-content/50">{error}</p>
          <button onClick={() => navigate('/diary')} className="btn btn-sm btn-ghost">Go back</button>
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      <Navbar
        left={navLeft}
        actions={
          <button
            onClick={() => setChatOpen(o => !o)}
            className={`btn btn-sm gap-1.5 ${chatOpen ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Chat</span>
            {chatMessages.length > 0 && (
              <span className="badge badge-xs badge-secondary">{chatMessages.length}</span>
            )}
          </button>
        }
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Page list */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-10 max-w-3xl">

            {/* Diary header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="text-4xl">📔</span>
                <div>
                  <h1 className="text-2xl font-bold leading-tight">{diaryTitle}</h1>
                  <p className="text-base-content/40 text-xs mt-0.5">
                    {documents.length} {documents.length === 1 ? 'entry' : 'entries'} total
                  </p>
                </div>
              </div>
              <button className="btn btn-primary btn-sm gap-1">
                <PlusIcon className="w-4 h-4" />
                New Page
              </button>
            </div>

            {/* Document list */}
            {documents.length === 0 ? (
              <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
                <div className="card-body items-center text-center py-16">
                  <span className="text-4xl">🗂️</span>
                  <p className="text-base-content/40 mt-2">No entries yet. Create your first page!</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((doc, index) => (
                  <div
                    key={doc.documentId}
                    onClick={() => navigate(`/diary/${id}/pages/${doc.documentId}`)}
                    className="card bg-base-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="card-body flex-row items-center gap-4 py-4 px-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/40 group-hover:bg-primary group-hover:text-primary-content transition-colors duration-200">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{formatDate(doc.date)}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{formatTime(doc.date)}</p>
                      </div>
                      <DocumentTextIcon className="w-4 h-4 text-base-content/20 group-hover:text-primary flex-shrink-0 transition-colors duration-200" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Chat drawer */}
        {chatOpen && (
          <aside className="w-80 shrink-0 bg-base-100 border-l border-base-300 flex flex-col shadow-lg">

            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <div>
                <p className="font-semibold text-sm">💬 Diary Chat</p>
                <p className="text-[10px] text-base-content/40">📔 {diaryTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  title={wsStatus}
                  className={`w-2 h-2 rounded-full ${
                    wsStatus === 'connected'  ? 'bg-success' :
                    wsStatus === 'connecting' ? 'bg-warning animate-pulse' :
                    wsStatus === 'error'      ? 'bg-error' : 'bg-base-300'
                  }`}
                />
                <button onClick={() => setChatOpen(false)} className="btn btn-ghost btn-xs btn-circle">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {chatMessages.length === 0 && (
                <p className="text-xs text-base-content/30 text-center mt-4">No messages yet.</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="flex flex-col gap-0.5 items-start">
                  <span className="text-[10px] text-base-content/40 px-1">
                    {msg.senderName ?? `User ${msg.senderId}`}
                  </span>
                  <div className="px-3 py-2 rounded-2xl text-sm max-w-[85%] bg-base-200 text-base-content rounded-bl-sm">
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-base-content/30 px-1">{msg.timestamp}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-3 border-t border-base-300 flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={wsStatus === 'connected' ? 'Say something...' : 'Connecting…'}
                rows={1}
                disabled={wsStatus !== 'connected'}
                className="textarea textarea-bordered textarea-sm flex-1 resize-none text-sm leading-snug"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || wsStatus !== 'connected'}
                className="btn btn-primary btn-sm btn-circle flex-shrink-0"
              >
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
