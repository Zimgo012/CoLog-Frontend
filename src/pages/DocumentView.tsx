import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeftIcon, ClockIcon, XMarkIcon, TrashIcon, CameraIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import * as Y from 'yjs'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { yXmlFragmentToProsemirrorJSON } from 'y-prosemirror'
import { editorSchema } from '../lib/editorSchema'
import Navbar from '../components/Navbar'
import ChatPopout from '../components/ChatPopout'
import CollabEditor from '../components/CollabEditor'
import ConfirmModal from '../components/ConfirmModal'
import { deleteDocument } from '../api/document'
import { getRevision, getRevisions, saveRevision, type Revision } from '../api/revision'
import { errorMessage } from '../api/client'
import { useDiarySession } from '../context/DiarySessionContext'
import { useAuth } from '../auth/AuthContext'

function formatDateTime(value: string) { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown time' }
function revisionTitle(revision: Revision) { return revision.label?.trim() || `Snapshot #${revision.revisionId}` }
function toBytes(value: Revision['yjsState']): Uint8Array | null {
  if (Array.isArray(value)) return new Uint8Array(value)
  if (value && typeof value === 'object') {
    const values = Object.values(value)
    return values.every(item => typeof item === 'number') ? new Uint8Array(values) : null
  }
  if (typeof value !== 'string') return null
  try {
    if (value.trim().startsWith('[')) {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'number')) return new Uint8Array(parsed)
    }
    // Spring serialises byte[] as base64. Accept URL-safe base64 too, since a
    // reverse proxy may convert the standard alphabet when returning JSON.
    const base64 = value.replace(/^data:.*?;base64,/, '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    return Uint8Array.from(raw, char => char.charCodeAt(0))
  } catch { return null }
}
function updatesThroughRevision(revisions: Revision[], selected: Revision): Uint8Array[] {
  const ordered = [...revisions].sort((a, b) => {
    const aTime = Date.parse(a.createdAt), bTime = Date.parse(b.createdAt)
    return Number.isNaN(aTime) || Number.isNaN(bTime) ? a.revisionId - b.revisionId : aTime - bTime
  })
  const selectedIndex = ordered.findIndex(item => item.revisionId === selected.revisionId)
  return (selectedIndex >= 0 ? ordered.slice(0, selectedIndex + 1) : ordered)
    .map(item => toBytes(item.yjsState))
    // An empty byte[] is not a Yjs update. Ignore placeholder/mock revisions
    // instead of passing them to Y.mergeUpdates.
    .filter((item): item is Uint8Array => item !== null && item.length > 0)
}
function buildRevisionDocument(updates: Uint8Array[]): Y.Doc {
  const apply = (source: Uint8Array[], version: 'v1' | 'v2') => {
    const ydoc = new Y.Doc()
    if (version === 'v1') Y.applyUpdate(ydoc, Y.mergeUpdates(source))
    else Y.applyUpdateV2(ydoc, Y.mergeUpdatesV2(source))
    return ydoc
  }

  try { return apply(updates, 'v1') }
  catch {
    // Some servers persist the more compact Yjs V2 encoding. It cannot be
    // decoded with the V1 merge/apply functions, so retry as V2.
    try { return apply(updates, 'v2') }
    catch {
      // Revisions saved before the raw-body endpoint may contain a malformed
      // update. New revisions are complete Yjs snapshots, so use the newest
      // valid snapshot rather than letting an old corrupt entry block preview.
      const latest = updates[updates.length - 1]
      if (!latest) throw new Error('No Yjs updates are available for this revision.')
      try { return apply([latest], 'v1') }
      catch { return apply([latest], 'v2') }
    }
  }
}

type DiffToken = { value: string; fontFamily?: string; fontSize?: string; bold?: boolean; italic?: boolean }
function revisionTokens(revision: Revision, revisions: Revision[]): DiffToken[] {
  const updates = updatesThroughRevision(revisions, revision)
  if (updates.length === 0) return []
  const ydoc = buildRevisionDocument(updates)
  try {
    const json = yXmlFragmentToProsemirrorJSON(ydoc.getXmlFragment('prosemirror'))
    const tokens: DiffToken[] = []
    const append = (text: string, marks: unknown) => {
      const markList = Array.isArray(marks) ? marks as Array<{ type?: string; attrs?: Record<string, unknown> }> : []
      const textStyle = markList.find(mark => mark.type === 'textStyle')?.attrs
      const style = {
        fontFamily: typeof textStyle?.fontFamily === 'string' ? textStyle.fontFamily : undefined,
        fontSize: typeof textStyle?.fontSize === 'string' ? textStyle.fontSize : undefined,
        bold: markList.some(mark => mark.type === 'strong'),
        italic: markList.some(mark => mark.type === 'em'),
      }
      for (const value of text.match(/\s+|[^\s]+/g) ?? []) tokens.push({ value, ...style })
    }
    const visit = (node: unknown, isLast = true) => {
      if (!node || typeof node !== 'object') return
      const value = node as { type?: unknown; text?: unknown; marks?: unknown; content?: unknown }
      if (typeof value.text === 'string') { append(value.text, value.marks); return }
      const content = value.content
      if (!Array.isArray(content)) return
      content.forEach((child, index) => visit(child, index === content.length - 1))
      if (!isLast && ['paragraph', 'heading', 'blockquote', 'list_item'].includes(String(value.type))) append('\n', [])
    }
    visit(json)
    return tokens
  } finally { ydoc.destroy() }
}

type DiffPart = DiffToken & { kind: 'same' | 'removed' | 'added' | 'styled' }
function tokenDiff(oldTokens: DiffToken[], newTokens: DiffToken[]): DiffPart[] {
  const result: DiffPart[] = []
  const sameStyle = (one: DiffToken, two: DiffToken) => one.fontFamily === two.fontFamily && one.fontSize === two.fontSize && one.bold === two.bold && one.italic === two.italic
  const add = (kind: DiffPart['kind'], token: DiffToken) => {
    const last = result[result.length - 1]
    if (last?.kind === kind && sameStyle(last, token)) last.value += token.value
    else result.push({ kind, ...token })
  }
  let oldIndex = 0, newIndex = 0
  while (oldIndex < oldTokens.length || newIndex < newTokens.length) {
    if (oldTokens[oldIndex]?.value === newTokens[newIndex]?.value) {
      add(sameStyle(oldTokens[oldIndex], newTokens[newIndex]) ? 'same' : 'styled', newTokens[newIndex])
      oldIndex++; newIndex++; continue
    }
    let oldMatch = -1, newMatch = -1
    for (let offset = 1; offset <= 80 && (oldIndex + offset < oldTokens.length || newIndex + offset < newTokens.length); offset++) {
      if (oldMatch < 0 && oldTokens[oldIndex + offset]?.value === newTokens[newIndex]?.value) oldMatch = offset
      if (newMatch < 0 && newTokens[newIndex + offset]?.value === oldTokens[oldIndex]?.value) newMatch = offset
      if (oldMatch >= 0 || newMatch >= 0) break
    }
    if (oldMatch >= 0 && (newMatch < 0 || oldMatch <= newMatch)) { oldTokens.slice(oldIndex, oldIndex + oldMatch).forEach(token => add('removed', token)); oldIndex += oldMatch }
    else if (newMatch >= 0) { newTokens.slice(newIndex, newIndex + newMatch).forEach(token => add('added', token)); newIndex += newMatch }
    else { if (oldIndex < oldTokens.length) add('removed', oldTokens[oldIndex++]); if (newIndex < newTokens.length) add('added', newTokens[newIndex++]) }
  }
  return result
}

function RevisionDiff({ newer, older, revisions }: { newer: Revision; older: Revision; revisions: Revision[] }) {
  const [diff, setDiff] = useState<DiffPart[] | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)
  useEffect(() => {
    try { setDiff(tokenDiff(revisionTokens(older, revisions), revisionTokens(newer, revisions))); setDiffError(null) }
    catch (error) { console.error('[Revision diff] Unable to decode revisions', error); setDiffError('These revisions could not be decoded for comparison.'); setDiff(null) }
  }, [newer, older, revisions])
  if (diffError) return <p className="text-sm text-error">{diffError}</p>
  if (!diff) return <span className="loading loading-spinner loading-sm text-primary" />
  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{diff.map((part, index) => {
    const style: CSSProperties = { fontFamily: part.fontFamily, fontSize: part.fontSize }
    const className = `${part.bold ? 'font-bold ' : ''}${part.italic ? 'italic ' : ''}${part.kind === 'added' ? 'bg-success/25 text-success-content rounded px-0.5' : part.kind === 'removed' ? 'bg-error/20 text-error line-through rounded px-0.5' : part.kind === 'styled' ? 'bg-warning/30 text-warning-content rounded px-0.5' : ''}`
    return part.kind === 'same' ? <span key={index} className={className} style={style}>{part.value}</span> : <mark key={index} className={className} style={style}>{part.value}</mark>
  })}</div>
}

function RevisionContent({ revision, revisions }: { revision: Revision; revisions: Revision[] }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  useEffect(() => {
    const mount = mountRef.current
    // Each saved yjsUpdate may be an incremental update. Replaying all updates
    // through the selected revision lets Yjs reconstruct the exact document state.
    const updates = updatesThroughRevision(revisions, revision)
    if (!mount || updates.length === 0) return
    setPreviewError(null)
    try {
      // mergeUpdates combines the incremental byte[] values into one valid
      // Yjs state update before it is applied to the preview document.
      const ydoc = buildRevisionDocument(updates)
      const doc = ProseMirrorNode.fromJSON(editorSchema, yXmlFragmentToProsemirrorJSON(ydoc.getXmlFragment('prosemirror')))
      const view = new EditorView(mount, { state: EditorState.create({ doc }), editable: () => false })
      return () => { view.destroy(); ydoc.destroy() }
    } catch (error) {
      console.error('[Revision preview] Unable to apply Yjs revisions', error)
      const detail = error instanceof Error && error.message ? ` (${error.message})` : ''
      setPreviewError(`This revision could not be decoded as a Yjs update${detail}`)
    }
  }, [revision, revisions])
  if (previewError) return <p className="text-sm text-error">{previewError}</p>
  if (updatesThroughRevision(revisions, revision).length === 0) return <p className="text-sm text-base-content/50">This snapshot has no saved content.</p>
  if (revision.yjsState && !toBytes(revision.yjsState)) return <pre className="whitespace-pre-wrap font-sans text-sm">{String(revision.yjsState)}</pre>
  return <div ref={mountRef} className="text-sm leading-relaxed [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6" />
}

export default function DocumentView() {
  const { id, pageId } = useParams(); const navigate = useNavigate(); const location = useLocation()
  const isOwnerFromPages = (location.state as { isOwner?: boolean } | null)?.isOwner === true
  const { openSession, wsStatus, wsError, chatMessages, sendChat } = useDiarySession(); const { user } = useAuth()
  const diaryId = Number(id), documentId = Number(pageId), validDocument = Number.isFinite(diaryId) && Number.isFinite(documentId) && documentId > 0
  const [historyOpen, setHistoryOpen] = useState(false); const [revisions, setRevisions] = useState<Revision[]>([])
  const [historyLoading, setHistoryLoading] = useState(false); const [historyError, setHistoryError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Revision | null>(null); const [previewLoading, setPreviewLoading] = useState(false)
  const [comparison, setComparison] = useState<{ newer: Revision; older: Revision } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false); const [deleting, setDeleting] = useState(false); const [deleteError, setDeleteError] = useState<string | null>(null)
  useEffect(() => { if (id) openSession(Number(id)) }, [id, openSession])
  const loadRevisions = useCallback(async () => {
    if (!validDocument) return; setHistoryLoading(true); setHistoryError(null)
    try { const all = await getRevisions(documentId); setRevisions([...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) }
    catch (error) { setHistoryError(errorMessage(error, 'Unable to load revision history.')) } finally { setHistoryLoading(false) }
  }, [documentId, validDocument])
  useEffect(() => { void loadRevisions() }, [loadRevisions])
  const handleSaveSnapshot = useCallback(async (yjsUpdate: Uint8Array) => {
    try { const revision = await saveRevision(documentId, yjsUpdate); setRevisions(items => [revision, ...items.filter(item => item.revisionId !== revision.revisionId)]); setHistoryError(null) }
    catch (error) { setHistoryError(errorMessage(error, 'Unable to save a snapshot.')); setHistoryOpen(true) }
  }, [documentId])
  const handleSnapshotError = useCallback((error: unknown) => {
    setHistoryError(errorMessage(error, 'Unable to save a snapshot.'))
    setHistoryOpen(true)
  }, [])
  const openPreview = useCallback(async (revisionId: number) => {
    setPreviewLoading(true); setHistoryError(null)
    try {
      const selected = await getRevision(documentId, revisionId)
      setRevisions(items => items.map(item => item.revisionId === selected.revisionId ? selected : item))
      setPreview(selected)
    } catch (error) { setHistoryError(errorMessage(error, 'Unable to load this revision.')) } finally { setPreviewLoading(false) }
  }, [documentId])
  const openComparison = useCallback(async (newerId: number, olderId: number) => {
    setPreviewLoading(true); setHistoryError(null)
    try {
      const [newer, older] = await Promise.all([getRevision(documentId, newerId), getRevision(documentId, olderId)])
      setRevisions(items => items.map(item => item.revisionId === newer.revisionId ? newer : item.revisionId === older.revisionId ? older : item))
      setComparison({ newer, older })
    } catch (error) { setHistoryError(errorMessage(error, 'Unable to compare these revisions.')) } finally { setPreviewLoading(false) }
  }, [documentId])
  const handleDelete = useCallback(async () => {
    if (!validDocument) return; setDeleting(true); setDeleteError(null)
    try { await deleteDocument(diaryId, documentId); navigate(`/diary/${diaryId}/pages`, { replace: true }) }
    catch (error) { setDeleteError(errorMessage(error, 'Unable to delete this page.')) } finally { setDeleting(false) }
  }, [diaryId, documentId, navigate, validDocument])
  const previewIndex = preview ? revisions.findIndex(item => item.revisionId === preview.revisionId) : -1
  const previousRevision = previewIndex >= 0 ? revisions[previewIndex + 1] : undefined

  return <div className="h-screen bg-base-200 flex flex-col overflow-hidden">
    <Navbar left={<><button onClick={() => navigate(`/diary/${id}/pages`, { state: { isOwner: isOwnerFromPages } })} className="btn btn-ghost btn-sm btn-circle" aria-label="Back"><ArrowLeftIcon className="w-5 h-5" /></button><span className="font-semibold text-sm">{pageId ? `Document ${pageId}` : 'Document'}</span></>} actions={<div className="flex gap-1"><button onClick={() => setHistoryOpen(open => !open)} className={`btn btn-sm btn-circle ${historyOpen ? 'btn-primary' : 'btn-ghost'}`} title="Revision history"><ClockIcon className="w-4 h-4" /></button><button onClick={() => setDeleteOpen(true)} className="btn btn-ghost btn-sm btn-circle text-error" title="Delete document"><TrashIcon className="w-4 h-4" /></button></div>} />
    <div className="flex flex-1 overflow-hidden"><main className="flex-1 overflow-y-auto"><div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col gap-4">
      {wsError && <div role="alert" className="alert alert-warning text-sm">{wsError}</div>}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">{!user || !validDocument ? <div className="min-h-96 flex items-center justify-center"><span className="loading loading-spinner loading-md text-primary" /></div> : <CollabEditor diaryId={diaryId} documentId={documentId} userId={user.id} userName={`${user.firstName} ${user.lastName}`.trim() || user.username} onSaveSnapshot={handleSaveSnapshot} onSnapshotError={handleSnapshotError} />}</div>
    </div></main>
    {historyOpen && <aside className="w-72 shrink-0 bg-base-100 border-l border-base-300 flex flex-col z-50"><div className="flex items-center justify-between px-4 py-3 border-b border-base-300"><span className="font-semibold text-sm">Revision History</span><button onClick={() => setHistoryOpen(false)} className="btn btn-ghost btn-xs btn-circle"><XMarkIcon className="w-4 h-4" /></button></div><div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"><p className="text-xs text-base-content/40">Select a snapshot to preview it or compare its changes.</p>{historyLoading && <span className="loading loading-spinner loading-sm text-primary self-center mt-4" />}{historyError && <div role="alert" className="alert alert-error text-xs py-2">{historyError}</div>}{!historyLoading && !historyError && revisions.length === 0 && <p className="text-xs text-base-content/40 py-4 text-center">No snapshots yet.</p>}{revisions.map(revision => <button key={revision.revisionId} onClick={() => void openPreview(revision.revisionId)} className="text-left p-3 rounded-xl border border-base-300 hover:border-primary/40 hover:bg-primary/5 transition-colors"><p className="text-xs font-semibold flex items-center gap-1"><CameraIcon className="w-3.5 h-3.5 text-primary" />{revisionTitle(revision)}</p><p className="text-[11px] text-base-content/50 mt-1">{formatDateTime(revision.createdAt)}</p>{revision.createdBy && <p className="text-[11px] text-base-content/40">by {revision.createdBy}</p>}</button>)}</div></aside>}</div>
    <ChatPopout messages={chatMessages} wsStatus={wsStatus} currentUserId={user?.id} onSend={(text) => sendChat(0, documentId, text)} />
    {previewLoading && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary" /></div>}{preview && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreview(null)}><div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between px-5 py-4 border-b border-base-300"><div><p className="font-bold flex items-center gap-2"><CameraIcon className="w-4 h-4 text-primary" />{revisionTitle(preview)}</p><p className="text-xs text-base-content/40 mt-0.5">Saved {formatDateTime(preview.createdAt)}</p></div><div className="flex items-center gap-2">{previousRevision && <button onClick={() => void openComparison(preview.revisionId, previousRevision.revisionId)} className="btn btn-primary btn-sm gap-1"><ArrowsRightLeftIcon className="w-4 h-4" />Compare changes</button>}<button onClick={() => setPreview(null)} className="btn btn-ghost btn-sm btn-circle"><XMarkIcon className="w-4 h-4" /></button></div></div><div className="overflow-y-auto p-6"><RevisionContent revision={preview} revisions={revisions} />{!previousRevision && <p className="text-xs text-base-content/40 mt-6">This is the first saved revision, so there is no earlier version to compare.</p>}</div></div></div>}
    {comparison && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setComparison(null)}><div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between px-5 py-4 border-b border-base-300"><div><p className="font-bold flex items-center gap-2"><ArrowsRightLeftIcon className="w-4 h-4 text-primary" />Revision changes</p><p className="text-xs text-base-content/40 mt-0.5">{revisionTitle(comparison.newer)} compared with {revisionTitle(comparison.older)}</p></div><button onClick={() => setComparison(null)} className="btn btn-ghost btn-sm btn-circle"><XMarkIcon className="w-4 h-4" /></button></div><div className="px-6 pt-4 text-xs text-base-content/50"><span className="bg-success/25 rounded px-1">Added</span><span className="bg-error/20 text-error rounded px-1 ml-3 line-through">Removed</span><span className="bg-warning/30 text-warning-content rounded px-1 ml-3">Styled</span></div><div className="overflow-y-auto p-6"><RevisionDiff newer={comparison.newer} older={comparison.older} revisions={revisions} /></div></div></div>}
    <ConfirmModal open={deleteOpen} title="Delete Document" description="Are you sure you want to delete this document? This cannot be undone." confirmLabel="Delete" loading={deleting} error={deleteError} onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteError(null) } }} onConfirm={handleDelete} />
  </div>
}
