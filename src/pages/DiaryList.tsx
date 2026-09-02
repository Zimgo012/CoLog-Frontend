import { useEffect, useState } from "react"
import { BookOpenIcon, UsersIcon, PlusIcon } from "@heroicons/react/24/outline"
import DiaryCard from "../components/DiaryCard"
import Navbar from "../components/Navbar"
import DiaryFormModal, { type DiaryFormValues } from "../components/DiaryFormModal"
import ConfirmModal from "../components/ConfirmModal"
import { getDiaries, getCollaboratedDiaries, addDiary, editDiary, deleteDiary } from "../api/diary"
import { useDiarySession } from "../context/DiarySessionContext"

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

  const [myDiaries, setMyDiaries]               = useState<NormalisedDiary[]>([])
  const [collaboratedDiaries, setCollaborated]  = useState<NormalisedDiary[]>([])
  const [loadError, setLoadError]               = useState<string | null>(null)

  // ── Form modal state ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen]   = useState(false)
  const [formMode, setFormMode]   = useState<"add" | "edit">("add")
  const [formTarget, setFormTarget] = useState<NormalisedDiary | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // ── Delete confirm state ──────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<NormalisedDiary | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // ── Disconnect on arrival ─────────────────────────────────────────────────
  useEffect(() => { closeSession() }, [])

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
    } catch {
      setLoadError("Failed to load diaries.")
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Add ───────────────────────────────────────────────────────────────────
  function openAdd() {
    setFormTarget(null)
    setFormMode("add")
    setFormOpen(true)
  }

  async function handleAdd(values: DiaryFormValues) {
    setFormSaving(true)
    try {
      await addDiary({ title: values.title, emoji: values.emoji, color: values.color })
      await fetchAll()
      setFormOpen(false)
    } catch {
    } finally {
      setFormSaving(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(diary: NormalisedDiary) {
    setFormTarget(diary)
    setFormMode("edit")
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
    } finally {
      setFormSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDiary(Number(deleteTarget.id))
      setMyDiaries(prev => prev.filter(d => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // keep confirm open on error
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Good day! 👋</h1>
          <p className="text-base-content/50 mt-1 text-sm">Here are your diaries.</p>
        </div>

        {loadError && (
          <div className="alert alert-error mb-6 text-sm">{loadError}</div>
        )}

        {/* My Diaries */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">My Diaries</h2>
              <span className="badge badge-primary badge-sm">{myDiaries.length}</span>
            </div>
            <button onClick={openAdd} className="btn btn-primary btn-sm gap-1">
              <PlusIcon className="w-4 h-4" />
              New Diary
            </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myDiaries.map(diary => (
                <DiaryCard
                  key={diary.id}
                  diary={diary}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </section>

        {/* Collaborated Diaries */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold">Collaborated Diaries</h2>
            <span className="badge badge-secondary badge-sm">{collaboratedDiaries.length}</span>
          </div>

          {collaboratedDiaries.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
              <div className="card-body items-center text-center py-12">
                <span className="text-4xl">🤝</span>
                <p className="text-base-content/50 mt-2">You haven't joined any shared diaries yet.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {collaboratedDiaries.map(diary => (
                <DiaryCard key={diary.id} diary={diary} isCollaborated />
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
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

    </div>
  )
}
