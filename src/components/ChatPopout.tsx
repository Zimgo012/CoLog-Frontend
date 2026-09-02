import { useRef, useState, useEffect, useCallback } from 'react'
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import type { ChatMessage, StompStatus } from '../api/websocket'

// ── Timestamp formatter ───────────────────────────────────────────────────────

function formatChatTimestamp(raw: string): string {
  if (!raw) return ''
  const date = new Date(raw)
  if (isNaN(date.getTime())) return raw

  const now       = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const msgDay    = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const time      = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (msgDay.getTime() === today.getTime())     return `Today ${time}`
  if (msgDay.getTime() === yesterday.getTime()) return `Yesterday ${time}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatPopoutProps {
  messages:       ChatMessage[]
  wsStatus:       StompStatus
  currentUserId?: number
  onSend:         (text: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatPopout({
  messages,
  wsStatus,
  currentUserId,
  onSend,
}: ChatPopoutProps) {

  const [open, setOpen]   = useState(false)
  // Default position: bottom-right, 24px from edges
  const [pos, setPos]     = useState({ x: window.innerWidth - 344, y: window.innerHeight - 520 })
  const [draft, setDraft] = useState('')
  // Track unseen messages when popout is closed
  const [unread, setUnread] = useState(0)
  const prevLenRef          = useRef(messages.length)

  const windowRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // ── Unread counter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open && messages.length > prevLenRef.current) {
      setUnread(u => u + (messages.length - prevLenRef.current))
    }
    prevLenRef.current = messages.length
  }, [messages.length, open])

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages])

  // ── Clamp position when window resizes ────────────────────────────────────
  useEffect(() => {
    function onResize() {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth  - 320),
        y: Math.min(prev.y, window.innerHeight - 480),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    function onMove(ev: MouseEvent) {
      if (!dragState.current) return
      const dx = ev.clientX - dragState.current.startX
      const dy = ev.clientY - dragState.current.startY
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 320, dragState.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 48,  dragState.current.origY + dy)),
      })
    }
    function onUp() {
      dragState.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [pos])

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }, [draft, onSend])

  return (
    <>
      {/* ── Floating toggle button — fixed bottom-right ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle chat"
        className={`fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
          open ? 'bg-primary text-primary-content' : 'bg-base-100 border border-base-300 text-base-content hover:bg-primary hover:text-primary-content hover:border-primary'
        }`}
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error text-error-content text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Floating popout window ── */}
      {open && (
        <div
          ref={windowRef}
          className="fixed z-[9999] flex flex-col bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden"
          style={{ left: pos.x, top: pos.y, width: 320, height: 460 }}
        >
          {/* Drag handle / title bar */}
          <div
            onMouseDown={onMouseDown}
            className="flex items-center justify-between px-4 py-2.5 bg-base-200 border-b border-base-300 cursor-grab active:cursor-grabbing select-none shrink-0"
          >
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Chat</span>
              <span
                title={wsStatus}
                className={`w-2 h-2 rounded-full ml-1 ${
                  wsStatus === 'connected'  ? 'bg-success' :
                  wsStatus === 'connecting' ? 'bg-warning animate-pulse' :
                  wsStatus === 'error'      ? 'bg-error' : 'bg-base-300'
                }`}
              />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label="Close chat"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-xs text-base-content/30 text-center mt-6">No messages yet.</p>
            )}
            {messages.map((msg, i) => {
              const isSelf   = currentUserId === msg.senderId
              const fullName = msg.senderName ?? `User ${msg.senderId}`
              const time     = formatChatTimestamp(msg.timestamp)
              return (
                <div key={i} className={`flex flex-col gap-0.5 ${isSelf ? 'items-end' : 'items-start'}`}>
                  {!isSelf && (
                    <span className="text-xs font-semibold text-base-content/70 px-1">
                      {fullName}
                    </span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                    isSelf
                      ? 'bg-primary text-primary-content rounded-br-sm'
                      : 'bg-base-200 text-base-content rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-base-content/30 px-1">{time}</span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-base-300 flex gap-2 items-end shrink-0">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder={wsStatus === 'connected' ? 'Say something…' : 'Connecting…'}
              rows={1}
              disabled={wsStatus !== 'connected'}
              className="textarea textarea-bordered textarea-sm flex-1 resize-none text-sm leading-snug"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || wsStatus !== 'connected'}
              className="btn btn-primary btn-sm btn-circle flex-shrink-0"
              aria-label="Send"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
