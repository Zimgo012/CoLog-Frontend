import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  UsersIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import Navbar from '../components/Navbar'
import ChatPopout from '../components/ChatPopout'
import CollaboratorModal from '../components/CollaboratorModal'
import { getDiary } from '../api/diary'
import { getDocuments, createDocument, deleteDocument, type Document } from '../api/document'
import ConfirmModal from '../components/ConfirmModal'
import { useDiarySession } from '../context/DiarySessionContext'
import { useAuth } from '../auth/AuthContext'
import { errorMessage } from '../api/client'

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

  const ownerId = diary.ownerId ?? diary.diaryOwnerId ?? diary.createdById ?? diary.creatorId ?? diary.userId ?? diary.owner?.id ?? diary.owner?.userId ?? diary.createdBy?.id
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

  const { openSession, wsStatus, wsError, chatMessages, sendChat, loadHistory } = useDiarySession()
  const { user } = useAuth()

  const [diaryTitle, setDiaryTitle] = useState('')
  const [diaryEmoji, setDiaryEmoji] = useState('📔')
  const [documents, setDocuments]   = useState<Document[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [addingPage, setAddingPage] = useState(false)
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)
  const [deletingPage, setDeletingPage] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
        // The profile ID is the primary ownership check. Navigation state
        // preserves a confirmed result when returning from a document view.
        setIsOwner(isDiaryOwner(diary, user) || isOwnerFromList)
        setDocuments([...docs].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ))
      })
      .catch(err => setError(errorMessage(err, 'Unable to load this diary. Please try again.')))
      .finally(() => setLoading(false))
  }, [id, user, isOwnerFromList])

  const handleDeletePage = useCallback(async () => {
    if (!id || !deleteTarget || deletingPage) return
    setDeletingPage(true)
    setDeleteError(null)
    try {
      await deleteDocument(Number(id), deleteTarget.documentId)
      setDocuments(items => items.filter(item => item.documentId !== deleteTarget.documentId))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(errorMessage(err, 'Unable to delete this page. Please try again.'))
    } finally {
      setDeletingPage(false)
    }
  }, [id, deleteTarget, deletingPage])

  // ── Add page ──────────────────────────────────────────────────────────────
  const handleNewPage = useCallback(async () => {
    if (!id || addingPage) return
    setAddingPage(true)
    try {
      // The create-document DTO requires a date.
      const date = new Date().toISOString().slice(0, -1)
      const newDoc = await createDocument({ date }, Number(id))
      setDocuments(prev => [newDoc, ...prev])
      navigate(`/diary/${id}/pages/${newDoc.documentId}`, { state: { isOwner } })
    } catch (err) {
      setError(errorMessage(err, 'Unable to create a new page. Please try again.'))
    } finally {
      setAddingPage(false)
    }
  }, [id, addingPage, isOwner, navigate])

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
        <div className="container mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">

            {wsError && <div role="alert" className="alert alert-warning mb-6 text-sm">{wsError}</div>}

            {/* Diary header */}
            <header className="mb-10 flex flex-col gap-6 rounded-[2.25rem] bg-base-100 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] bg-base-200 text-4xl shadow-[0_5px_14px_oklch(var(--bc)/.07)]">{diaryEmoji}</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Diary</p>
                  <h1 className="mt-1 truncate text-3xl font-black tracking-[-0.04em]">{diaryTitle}</h1>
                  <p className="mt-1 text-sm text-base-content/55">{documents.length} {documents.length === 1 ? 'entry' : 'entries'} saved here</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCollaboratorsOpen(true)}
                  className="btn btn-ghost btn-sm gap-1 bg-base-200/70"
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
            </header>

            {/* Document list */}
            {documents.length === 0 ? (
              <div className="rounded-[2rem] bg-base-100 px-6 py-16 text-center shadow-sm">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.4rem] bg-base-200 text-3xl">🗂️</div>
                  <p className="mt-5 font-bold">No entries yet</p>
                  <p className="mt-1 text-sm text-base-content/50">Start the first page in this diary.</p>
                  <button onClick={handleNewPage} disabled={addingPage} className="btn btn-primary btn-sm mt-5 gap-1"><PlusIcon className="w-4 h-4" />New page</button>
                </div>
            ) : (
              <section>
                <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black tracking-[-0.02em]">Entries</h2><span className="text-xs font-semibold text-base-content/45">Newest first</span></div>
              <div className="flex flex-col gap-3">
                {documents.map(doc => (
                  <div
                    key={doc.documentId}
                    onClick={() => navigate(`/diary/${id}/pages/${doc.documentId}`, { state: { isOwner } })}
                    className="diary-page-row cursor-pointer rounded-[1.5rem] bg-base-100 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">{formatDate(doc.date)}</p>
                        <p className="mt-0.5 text-xs text-base-content/45">{formatTime(doc.date)}</p>
                      </div>
                      {isOwner && <button
                        type="button"
                        onClick={event => { event.stopPropagation(); setDeleteError(null); setDeleteTarget(doc) }}
                        className="btn btn-ghost btn-sm btn-circle text-base-content/30 hover:text-error hover:bg-error/10"
                        title="Delete page"
                        aria-label={`Delete page from ${formatDate(doc.date)}`}
                      ><TrashIcon className="w-4 h-4" /></button>}
                      <DocumentTextIcon className="h-5 w-5 shrink-0 text-primary/55" />
                    </div>
                  </div>
                ))}
              </div>
              </section>
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

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Page"
        description={`Are you sure you want to delete the entry from ${deleteTarget ? formatDate(deleteTarget.date) : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deletingPage}
        error={deleteError}
        onClose={() => { if (!deletingPage) { setDeleteTarget(null); setDeleteError(null) } }}
        onConfirm={() => { void handleDeletePage() }}
      />

      <footer className="footer footer-center p-4 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
