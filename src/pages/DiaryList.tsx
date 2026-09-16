import { useEffect, useState } from "react"
import { BookOpenIcon, UsersIcon, PlusIcon } from "@heroicons/react/24/outline"
import DiaryCard from "../components/DiaryCard"
import Navbar from "../components/Navbar"
import DiaryFormModal, { type DiaryFormValues } from "../components/DiaryFormModal"
import ConfirmModal from "../components/ConfirmModal"
import { getDiaries, getCollaboratedDiaries, addDiary, editDiary, deleteDiary } from "../api/diary"
import { useDiarySession } from "../context/DiarySessionContext"
import { useNotifications } from "../context/NotificationContext"
import { errorMessage } from "../api/client"

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_COLORS = ["blue","purple","pink","red","orange","yellow","green","teal"]

function normalise(raw: any) {
  console.debug("[normalise] raw diary:", raw)

  let emoji: string = raw.emoji ?? ""
  let color: string = raw.color ?? ""

  // Detect swapped fields: if emoji holds a color key and color holds an emoji char
  const emojiIsColorKey = VALID_COLORS.includes(emoji)
  const colorIsEmoji    = color.length > 0 && !VALID_COLORS.includes(color)

  if (emojiIsColorKey && colorIsEmoji) {
    // They're swapped — correct them
    ;[emoji, color] = [color, emoji]
  }

  // Fall back to defaults if still invalid after swap attempt
  if (!emoji || VALID_COLORS.includes(emoji)) emoji = "📓"
  if (!color || !VALID_COLORS.includes(color))  color = "blue"

  return {
    id:        String(raw.diaryId ?? raw.id),
    title:     raw.title     ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    emoji,
    color,
    owner:     raw.owner     ?? undefined,
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface NormalisedDiary{
  id:        string
  title:     string
  createdAt: string
  emoji:     string
  color:     string
  owner?:    string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiaryList() {
  const { closeSession } = useDiarySession()
  const { lastNotification } = useNotifications()

  const [myDiaries, setMyDiaries]               = useState<NormalisedDiary[]>([])
  const [collaboratedDiaries, setCollaborated]  = useState<NormalisedDiary[]>([])
  const [loadError, setLoadError]               = useState<string | null>(null)
  const [formError, setFormError]               = useState<string | null>(null)
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  // ── Form modal state ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen]   = useState(false)
  const [formMode, setFormMode]   = useState<"add" | "edit">("add")
  const [formTarget, setFormTarget] = useState<NormalisedDiary | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // ── Delete confirm state ──────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<NormalisedDiary | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // ── Disconnect an open diary session on arrival ───────────────────────────
  useEffect(() => { closeSession() }, [closeSession])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchAll() {
    try {
      const [my, collaborated] = await Promise.all([
        getDiaries(),
        getCollaboratedDiaries(),
      ])
      console.debug("[DiaryList] getDiaries response:", my)
      setMyDiaries(my.map(normalise))
      setCollaborated(collaborated.map(normalise))
    } catch (err) {
      setLoadError(errorMessage(err, "Unable to load diaries. Please try again."))
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Keep shared diaries in sync with collaborator notifications ───────────
  useEffect(() => {
    if (!lastNotification) return

    if (lastNotification.isRemoval && lastNotification.diaryId) {
      setCollaborated(prev => prev.filter(diary => diary.id !== String(lastNotification.diaryId)))
    }

    void fetchAll()
  }, [lastNotification?.id])

  // ── Add ───────────────────────────────────────────────────────────────────
  function openAdd() {
    setFormTarget(null)
    setFormMode("add")
    setFormError(null)
    setFormOpen(true)
  }

  async function handleAdd(values: DiaryFormValues) {
    setFormSaving(true)
    try {
      await addDiary({ title: values.title, emoji: values.emoji, color: values.color })
      await fetchAll()
      setFormOpen(false)
    } catch (err) {
      setFormError(errorMessage(err, "Unable to create this diary. Please try again."))
    } finally {
      setFormSaving(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(diary: NormalisedDiary) {
    setFormTarget(diary)
    setFormMode("edit")
    setFormError(null)
    setFormOpen(true)
  }

  async function handleEdit(values: DiaryFormValues) {
    if (!formTarget) return
    setFormSaving(true)
    try {
      const updated = await editDiary(Number(formTarget.id), values)
      console.debug("[DiaryList] editDiary response:", updated)
      await fetchAll()
      setFormOpen(false)
    } catch (err) {
      console.error("[DiaryList] editDiary error:", err)
      setFormError(errorMessage(err, "Unable to update this diary. Please try again."))
    } finally {
      setFormSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteDiary(Number(deleteTarget.id))
      setMyDiaries(prev => prev.filter(d => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(errorMessage(err, "Unable to delete this diary. Please try again."))
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      <Navbar />

      <main className="flex-1 container mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">

        <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Your workspace</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Diaries</h1>
            <p className="mt-2 text-sm text-base-content/60">Keep your thoughts, notes, and shared pages together.</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary gap-1.5 self-start sm:self-auto"><PlusIcon className="w-4 h-4" />New diary</button>
        </header>

        {loadError && (
          <div role="alert" className="alert alert-error mb-6 text-sm">{loadError}</div>
        )}

        {/* My Diaries */}
        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/15 text-primary"><BookOpenIcon className="w-4 h-4" /></span><h2 className="text-xl font-black tracking-[-0.025em]">My diaries</h2><span className="badge badge-primary badge-sm">{myDiaries.length}</span></div><p className="mt-2 text-sm text-base-content/55">Your private and collaborative home base.</p></div>
          </div>

          {myDiaries.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
              <div className="card-body items-center text-center py-12">
                <span className="text-4xl">📓</span>
                <p className="text-base-content/50 mt-2">No diaries yet. Create your first one!</p>
                <button onClick={openAdd} className="btn btn-primary btn-sm mt-3 gap-1">
                  <PlusIcon className="w-4 h-4" /> New Diary
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myDiaries.map(diary => (
                <DiaryCard
                  key={diary.id}
                  diary={diary}
                  index={myDiaries.indexOf(diary)}
                  onEdit={openEdit}
                  onDelete={diary => { setDeleteError(null); setDeleteTarget(diary) }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Collaborated Diaries */}
        <section>
          <div className="mb-5"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-secondary text-secondary-content"><UsersIcon className="w-4 h-4" /></span><h2 className="text-xl font-black tracking-[-0.025em]">Shared with me</h2><span className="badge badge-secondary badge-sm">{collaboratedDiaries.length}</span></div><p className="mt-2 text-sm text-base-content/55">Diaries your collaborators have invited you into.</p></div>

          {collaboratedDiaries.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
              <div className="card-body items-center text-center py-12">
                <span className="text-4xl">🤝</span>
                <p className="text-base-content/50 mt-2">You haven't joined any shared diaries yet.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collaboratedDiaries.map(diary => (
                <DiaryCard key={diary.id} diary={diary} index={collaboratedDiaries.indexOf(diary)} isCollaborated />
              ))}
            </div>
          )}
        </section>

      </main>

      <footer className="footer footer-center p-4 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>

      {/* Add / Edit modal */}
      <DiaryFormModal
        open={formOpen}
        mode={formMode}
        initial={formTarget ?? undefined}
        saving={formSaving}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={formMode === "add" ? handleAdd : handleEdit}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Diary"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        error={deleteError}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

    </div>
  )
}
