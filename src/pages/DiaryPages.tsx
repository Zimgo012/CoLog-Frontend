import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import ChatPopout from '../components/ChatPopout'
import CollaboratorModal from '../components/CollaboratorModal'
import { getDiary } from '../api/diary'
import { getDocuments, createDocument, type Document } from '../api/document'
import { useDiarySession } from '../context/DiarySessionContext'
import { useAuth } from '../auth/AuthContext'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const VALID_COLORS = ["blue","purple","pink","red","orange","yellow","green","teal"]

function normaliseDiary(diary: any) {
  let emoji: string = diary.emoji ?? ""
  let color: string = diary.color ?? ""

  const emojiIsColorKey = VALID_COLORS.includes(emoji)
  const colorIsEmoji    = color.length > 0 && !VALID_COLORS.includes(color)
  if (emojiIsColorKey && colorIsEmoji) {
    ;[emoji, color] = [color, emoji]
  }

  if (!emoji || VALID_COLORS.includes(emoji)) emoji = "📓"

  return { title: diary.title ?? "", emoji }
}

function isDiaryOwner(diary: any, user: { id: number; username: string } | null) {
  if (!user) return false

  const ownerId = diary.ownerId ?? diary.owner?.id ?? diary.owner?.userId
  if (ownerId !== undefined && ownerId !== null) return Number(ownerId) === user.id

  const ownerUsername = diary.ownerUsername ?? diary.diaryOwnerName ?? diary.owner?.username ?? diary.owner
  return typeof ownerUsername === 'string' && ownerUsername === user.username
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DiaryPages() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isOwnerFromList = (location.state as { isOwner?: boolean } | null)?.isOwner === true

  const { openSession, wsStatus, chatMessages, sendChat, loadHistory } = useDiarySession()
  const { user } = useAuth()

  const [diaryTitle, setDiaryTitle] = useState('')
  const [diaryEmoji, setDiaryEmoji] = useState('📔')
  const [documents, setDocuments]   = useState<Document[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [addingPage, setAddingPage] = useState(false)
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

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
    setIsOwner(false)

    Promise.all([getDiary(numId), getDocuments(numId), loadHistory(numId)])
      .then(([diary, docs]) => {
        const { title, emoji } = normaliseDiary(diary)
        setDiaryTitle(title)
        setDiaryEmoji(emoji)
        setIsOwner(isOwnerFromList || isDiaryOwner(diary, user))
        setDocuments([...docs].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ))
      })
      .catch(() => setError('Failed to load diary.'))
      .finally(() => setLoading(false))
  }, [id, user, isOwnerFromList])

  // ── Add page ──────────────────────────────────────────────────────────────
  const handleNewPage = useCallback(async () => {
    if (!id || addingPage) return
    setAddingPage(true)
    try {
      const newDoc = await createDocument({}, Number(id))
      setDocuments(prev => [newDoc, ...prev])
      navigate(`/diary/${id}/pages/${newDoc.documentId}`)
    } catch {
      // could add a toast here later
    } finally {
      setAddingPage(false)
    }
  }, [id, addingPage, navigate])

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

      <Navbar left={navLeft} />

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-10 max-w-3xl">

            {/* Diary header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{diaryEmoji}</span>
                <div>
                  <h1 className="text-2xl font-bold leading-tight">{diaryTitle}</h1>
                  <p className="text-base-content/40 text-xs mt-0.5">
                    {documents.length} {documents.length === 1 ? 'entry' : 'entries'} total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCollaboratorsOpen(true)}
                  className="btn btn-ghost btn-sm gap-1"
                >
                  <UsersIcon className="w-4 h-4" />
                  Collaborators
                </button>
                <button
                  onClick={handleNewPage}
                  disabled={addingPage}
                  className="btn btn-primary btn-sm gap-1"
                >
                  {addingPage
                    ? <span className="loading loading-spinner loading-xs" />
                    : <PlusIcon className="w-4 h-4" />
                  }
                  New Page
                </button>
              </div>
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

      {/* Floating chat popout */}
      <ChatPopout
        messages={chatMessages}
        wsStatus={wsStatus}
        currentUserId={user?.id}
        onSend={(text) => sendChat(0, 0, text)}
      />

      <CollaboratorModal
        open={collaboratorsOpen}
        diaryId={Number(id)}
        canRemove={isOwner}
        onClose={() => setCollaboratorsOpen(false)}
      />

      <footer className="footer footer-center p-4 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
