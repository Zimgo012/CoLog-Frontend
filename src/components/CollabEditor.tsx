/**
 * CollabEditor — ProseMirror + YJS collaborative editor.
 * Mirrors stomp2.html: own STOMP client, subscribes inside onConnect.
 * - YJSUPDATE is debounced: batches rapid edits, flushes after 500ms idle
 * - Presence bar shows remote users from YJS awareness
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { CameraIcon } from '@heroicons/react/24/outline'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { Client } from '@stomp/stompjs'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { schema } from 'prosemirror-schema-basic'
import { history, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import {
  ySyncPlugin,
  ySyncPluginKey,
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from 'y-prosemirror'
import { presencePluginKey, createPresencePlugin } from '../lib/presencePlugin'

const WS_URL  = import.meta.env.VITE_WS_URL  ?? 'ws://localhost:8083'
const API_URL = import.meta.env.VITE_API_URL  ?? 'http://localhost:8083'

function userColor(userId: number): string {
  const p = ['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#14b8a6','#92400e']
  return p[Math.abs(userId) % p.length]
}

function decodeBytes(value: unknown): Uint8Array | null {
  if (typeof value === 'string') {
    try {
      const b = atob(value)
      const u = new Uint8Array(b.length)
      for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i)
      return u
    } catch { return null }
  }
  if (Array.isArray(value))        { try { return new Uint8Array(value as number[]) } catch { return null } }
  if (value instanceof Uint8Array)  return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return null
}

// ── Presence types ────────────────────────────────────────────────────────────
interface RemoteUser {
  clientId: number
  name:     string
  color:    string
  typing:   boolean
}

interface CollabEditorProps {
  diaryId:    number
  documentId: number
  userId:     number
  userName:   string
  onSaveSnapshot: (yjsUpdate: Uint8Array) => Promise<void>
  onSnapshotError?: (error: unknown) => void
}

export default function CollabEditor({ diaryId, documentId, userId, userName, onSaveSnapshot, onSnapshotError }: CollabEditorProps) {
  const mountRef    = useRef<HTMLDivElement>(null)
  const saveSnapshotRef = useRef<(() => Promise<void>) | null>(null)
  const savingSnapshotRef = useRef(false)
  // Awareness state lifted to React so presence bar re-renders
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const [savingSnapshot, setSavingSnapshot] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'waiting' | 'saving' | 'error'>('saved')

  // Stable ref for the awareness object so the awareness change handler
  // can call setRemoteUsers without being re-created on every render
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null)

  const refreshPresence = useCallback((myClientId: number) => {
    const aw = awarenessRef.current
    if (!aw) return
    const users: RemoteUser[] = []
    aw.getStates().forEach((state, clientId) => {
      if (clientId === myClientId) return
      const u = (state as any)?.user
      if (!u) return
      users.push({
        clientId,
        name:   u.name  ?? `User ${u.id ?? clientId}`,
        color:  u.color ?? '#888',
        typing: (state as any)?.typing === true,
      })
    })
    setRemoteUsers(users)
  }, [])

  useEffect(() => {
    if (!mountRef.current) return

    // ── YDoc + Awareness ──────────────────────────────────────────────────
    const ydoc      = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(ydoc)
    awarenessRef.current = awareness
    const yXml      = ydoc.getXmlFragment('prosemirror')

    // ── Auth token ────────────────────────────────────────────────────────
    const token = localStorage.getItem('token') ?? ''

    // ── Persistence (2 s debounce) ────────────────────────────────────────
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let saveGeneration = 0
    async function persistState(state = Y.encodeStateAsUpdate(ydoc)) {
      const response = await fetch(`${API_URL}/document/${diaryId}/${documentId}/yjs`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
        body:    state.buffer as ArrayBuffer,
      })
      if (!response.ok) throw new Error('Unable to save the current document state.')
    }
    function scheduleSave() {
      clearTimeout(saveTimer ?? undefined)
      const generation = ++saveGeneration
      setAutoSaveStatus('waiting')
      saveTimer = setTimeout(() => {
        saveTimer = null
        setAutoSaveStatus('saving')
        persistState()
          .then(() => { if (!destroyed && generation === saveGeneration) setAutoSaveStatus('saved') })
          .catch((e) => {
            console.error('[CollabEditor] save error', e)
            if (!destroyed && generation === saveGeneration) setAutoSaveStatus('error')
          })
      }, 2000)
    }

    const saveSnapshot = async () => {
      if (savingSnapshotRef.current) return
      savingSnapshotRef.current = true
      setSavingSnapshot(true)
      try {
        clearTimeout(saveTimer ?? undefined)
        saveTimer = null
        const state = Y.encodeStateAsUpdate(ydoc)
        await persistState(state)
        await onSaveSnapshot(state)
        if (!destroyed) setAutoSaveStatus('saved')
      } catch (error) {
        onSnapshotError?.(error)
      } finally {
        savingSnapshotRef.current = false
        if (!destroyed) setSavingSnapshot(false)
      }
    }
    saveSnapshotRef.current = saveSnapshot

    // ── AFK debounce for YJSUPDATE ────────────────────────────────────────
    // Accumulate updates while the user is actively typing, flush after
    // 500 ms of inactivity. This avoids spamming the backend on every keystroke.
    let pendingOutbound: Uint8Array[] = []
    let afkTimer: ReturnType<typeof setTimeout> | null = null

    function flushOutbound(stompClient: Client) {
      afkTimer = null
      if (pendingOutbound.length === 0 || !stompClient.connected) return
      // Merge all pending updates into one
      const merged = Y.mergeUpdates(pendingOutbound)
      pendingOutbound = []
      stompClient.publish({
        destination: `/app/diary/session/${diaryId}`,
        body: JSON.stringify({
          type:    'YJSUPDATE',
          payload: { senderId: userId, documentId, yjs: Array.from(merged) },
        }),
      })
      scheduleSave()
    }

    // ── Editor locals ─────────────────────────────────────────────────────
    let currentState: EditorState = EditorState.create({ schema })
    let typingTimer: ReturnType<typeof setTimeout> | null = null
    let destroyed = false   // set true in cleanup to gate all view access
    const viewBox = { current: null as EditorView | null }

    // ── Cursor sync ───────────────────────────────────────────────────────
    function getBinding() {
      if (!viewBox.current?.state) return null
      try { return ySyncPluginKey.getState(viewBox.current.state)?.binding ?? null } catch { return null }
    }
    function syncCursor() {
      const binding = getBinding()
      if (!binding || !viewBox.current?.state) return
      try {
        const { from, to } = viewBox.current.state.selection
        const ar = absolutePositionToRelativePosition(from, binding.type, binding.mapping)
        const hr = absolutePositionToRelativePosition(to,   binding.type, binding.mapping)
        awareness.setLocalStateField('cursor', {
          anchor: Array.from(Y.encodeRelativePosition(ar)),
          head:   Array.from(Y.encodeRelativePosition(hr)),
        })
      } catch { /* binding not ready */ }
    }

    // ── Provider-like object for presencePlugin ───────────────────────────
    const providerLike = {
      getUsers:     () => awareness.getStates(),
      getClientId:  () => awareness.clientID,
      getAwareness: () => awareness,
      getCursorPosition(cursor: { anchor: number[]; head: number[] }) {
        const binding = getBinding()
        if (!binding || !cursor) return null
        try {
          const ab = decodeBytes(cursor.anchor)
          const hb = decodeBytes(cursor.head)
          if (!ab || !hb) return null
          const anchor = relativePositionToAbsolutePosition(ydoc, binding.type, Y.decodeRelativePosition(ab), binding.mapping)
          const head   = relativePositionToAbsolutePosition(ydoc, binding.type, Y.decodeRelativePosition(hb), binding.mapping)
          if (anchor == null || head == null) return null
          return { anchor, head }
        } catch { return null }
      },
    }

    // ── Set local user in awareness ───────────────────────────────────────
    awareness.setLocalStateField('user', { id: userId, name: userName, color: userColor(userId) })

    // ── Build full EditorState ────────────────────────────────────────────
    currentState = EditorState.create({
      schema,
      plugins: [
        ySyncPlugin(yXml),
        history(),
        createPresencePlugin(providerLike as any),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
      ],
    })

    // ── Create EditorView ─────────────────────────────────────────────────
    const editorView = new EditorView(mountRef.current, {
      state: currentState,
      dispatchTransaction(tr) {
        if (destroyed || !viewBox.current) return
        try {
          currentState = currentState.apply(tr)
          viewBox.current.updateState(currentState)
          setTimeout(syncCursor, 0)
        } catch { /* view teardown race */ }
      },
      handleDOMEvents: {
        input: () => {
          awareness.setLocalStateField('typing', true)
          clearTimeout(typingTimer ?? undefined)
          typingTimer = setTimeout(() => awareness.setLocalStateField('typing', false), 1000)
          return false
        },
        click:   () => { setTimeout(syncCursor, 0); return false },
        keyup:   () => { setTimeout(syncCursor, 0); return false },
        mouseup: () => { setTimeout(syncCursor, 0); return false },
      },
    })
    viewBox.current = editorView

    // ── Rebuild remote cursors on awareness change + update presence bar ──
    awareness.on('change', () => {
      if (!destroyed && viewBox.current) {
        try {
          const tr = viewBox.current.state.tr
          tr.setMeta(presencePluginKey, true)
          viewBox.current.dispatch(tr)
        } catch { /* view teardown race */ }
      }
      refreshPresence(awareness.clientID)
    })

    // ── STOMP client ──────────────────────────────────────────────────────
    let pendingYjs: Uint8Array[] = []
    let initializing = true
    const REMOTE = {}

    const stomp = new Client({
      brokerURL: `${WS_URL}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        diaryId:       String(diaryId),
      },
      reconnectDelay: 5000,
      debug: (msg) => console.debug('[CollabEditor STOMP]', msg),

      onConnect() {
        console.log('[CollabEditor] STOMP connected, diary', diaryId, 'doc', documentId)

        // Subscribe YJS doc updates
        stomp.subscribe(
          `/topic/diary/${diaryId}/documentId/${documentId}/yjs`,
          (msg) => {
            try {
              const data    = JSON.parse(msg.body)
              const payload = data.payload ?? data
              const update  = decodeBytes(payload.yjs)
              if (!update) return
              if (initializing) { pendingYjs.push(update); return }
              Y.applyUpdate(ydoc, update, REMOTE)
            } catch (e) { console.error('[CollabEditor] YJS msg error', e) }
          }
        )

        // Subscribe Presence (awareness)
        stomp.subscribe(
          `/topic/diary/${diaryId}/documentId/${documentId}/presence`,
          (msg) => {
            try {
              const data    = JSON.parse(msg.body)
              const payload = data.payload ?? data
              const update  = decodeBytes(payload.awareness)
              if (!update) return
              awarenessProtocol.applyAwarenessUpdate(awareness, update, REMOTE)
            } catch (e) { console.error('[CollabEditor] Presence msg error', e) }
          }
        )

        // Load DB snapshot → drain buffered live updates
        fetch(`${API_URL}/document/${diaryId}/${documentId}/yjs`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (res) => {
            if (res.ok) {
              const saved = new Uint8Array(await res.arrayBuffer())
              if (saved.length > 0) Y.applyUpdate(ydoc, saved, REMOTE)
            }
          })
          .catch((e) => console.warn('[CollabEditor] No saved YJS state:', e))
          .finally(() => {
            for (const u of pendingYjs) Y.applyUpdate(ydoc, u, REMOTE)
            pendingYjs   = []
            initializing = false
          })

        // Outgoing YJS — debounced: accumulate updates, flush after 500 ms idle
        ydoc.on('update', (update: Uint8Array, origin: unknown) => {
          if (origin === REMOTE) return
          if (!stomp.connected) return
          pendingOutbound.push(update)
          setAutoSaveStatus('waiting')
          clearTimeout(afkTimer ?? undefined)
          afkTimer = setTimeout(() => flushOutbound(stomp), 500)
        })

        // Outgoing Presence (awareness) — sent immediately on every change
        awareness.on('update', (
          { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
          origin: unknown
        ) => {
          if (origin === REMOTE) return
          const changed = [...added, ...updated, ...removed]
          if (changed.length === 0 || !stomp.connected) return
          const enc = awarenessProtocol.encodeAwarenessUpdate(awareness, changed)
          stomp.publish({
            destination: `/app/diary/session/${diaryId}`,
            body: JSON.stringify({
              type:    'PRESENCE',
              payload: { senderId: userId, documentId, awareness: Array.from(enc) },
            }),
          })
        })
      },

      onStompError:     (f) => console.error('[CollabEditor] STOMP error',   f.headers, f.body),
      onWebSocketError: (e) => console.error('[CollabEditor] WS error',      e),
    })

    stomp.activate()

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      destroyed = true          // gate all view/awareness access immediately
      saveSnapshotRef.current = null
      clearTimeout(saveTimer   ?? undefined)
      clearTimeout(typingTimer ?? undefined)
      clearTimeout(afkTimer    ?? undefined)
      if (pendingOutbound.length > 0 && stomp.connected) flushOutbound(stomp)
      try { awareness.setLocalState(null) } catch { /* ignore */ }
      viewBox.current      = null
      awarenessRef.current = null
      editorView.destroy()
      awareness.destroy()
      ydoc.destroy()
      stomp.deactivate()
    }
  }, [diaryId, documentId, userId, userName, refreshPresence, onSaveSnapshot, onSnapshotError])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Top bar: presence + hints */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-base-200 bg-base-100 select-none min-h-[40px]">

        {/* Remote users presence avatars */}
        {remoteUsers.length > 0 && (
          <div className="flex items-center gap-1.5">
            {remoteUsers.map(u => (
              <div
                key={u.clientId}
                title={u.typing ? `${u.name} is typing…` : u.name}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white transition-all"
                style={{ backgroundColor: u.color }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-white ${u.typing ? 'animate-pulse' : 'opacity-70'}`}
                />
                {u.name.split(' ')[0]}
              </div>
            ))}
          </div>
        )}

        {/* Keyboard hint + save status */}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-base-content/40">
          <button
            type="button"
            onClick={() => { void saveSnapshotRef.current?.() }}
            disabled={savingSnapshot || autoSaveStatus === 'waiting' || autoSaveStatus === 'saving'}
            className="btn btn-ghost btn-xs gap-1 normal-case text-base-content/60"
            title={autoSaveStatus === 'waiting' || autoSaveStatus === 'saving' ? 'Wait for the current edits to auto-save before creating a snapshot' : 'Save a revision snapshot'}
          >
            {savingSnapshot ? <span className="loading loading-spinner loading-xs" /> : <CameraIcon className="w-3.5 h-3.5" />}
            Save snapshot
          </button>
          <span><kbd className="kbd kbd-xs">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="kbd kbd-xs">Ctrl+Y</kbd> Redo</span>
          <span className={`flex items-center gap-1 ${autoSaveStatus === 'error' ? 'text-error' : 'opacity-60'}`}>
            {(autoSaveStatus === 'waiting' || autoSaveStatus === 'saving') && <span className="loading loading-spinner loading-xs" />}
            {autoSaveStatus === 'waiting' ? 'Auto-save pending' : autoSaveStatus === 'saving' ? 'Saving…' : autoSaveStatus === 'error' ? 'Auto-save failed' : 'Auto-saved'}
          </span>
        </div>
      </div>

      {/* ProseMirror mount */}
      <div
        ref={mountRef}
        className="
          flex-1 overflow-y-auto
          px-12 py-10
          bg-base-100
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:min-h-[520px]
          [&_.ProseMirror]:text-base
          [&_.ProseMirror]:leading-relaxed
          [&_.ProseMirror]:text-base-content
          [&_.ProseMirror_p]:my-1.5
          [&_.ProseMirror_h1]:text-2xl
          [&_.ProseMirror_h1]:font-bold
          [&_.ProseMirror_h1]:mt-6
          [&_.ProseMirror_h1]:mb-2
          [&_.ProseMirror_h2]:text-xl
          [&_.ProseMirror_h2]:font-semibold
          [&_.ProseMirror_h2]:mt-5
          [&_.ProseMirror_h2]:mb-1.5
          [&_.ProseMirror_h3]:text-lg
          [&_.ProseMirror_h3]:font-semibold
          [&_.ProseMirror_h3]:mt-4
          [&_.ProseMirror_h3]:mb-1
          [&_.ProseMirror_ul]:list-disc
          [&_.ProseMirror_ul]:pl-6
          [&_.ProseMirror_ol]:list-decimal
          [&_.ProseMirror_ol]:pl-6
          [&_.ProseMirror_li]:my-0.5
          [&_.ProseMirror_blockquote]:border-l-4
          [&_.ProseMirror_blockquote]:border-primary/40
          [&_.ProseMirror_blockquote]:pl-4
          [&_.ProseMirror_blockquote]:italic
          [&_.ProseMirror_blockquote]:text-base-content/60
          [&_.ProseMirror_code]:bg-base-200
          [&_.ProseMirror_code]:rounded
          [&_.ProseMirror_code]:px-1.5
          [&_.ProseMirror_code]:py-0.5
          [&_.ProseMirror_code]:text-sm
          [&_.ProseMirror_code]:font-mono
          [&_.ProseMirror_pre]:bg-base-200
          [&_.ProseMirror_pre]:rounded-lg
          [&_.ProseMirror_pre]:p-4
          [&_.ProseMirror_pre]:text-sm
          [&_.ProseMirror_pre]:font-mono
          [&_.ProseMirror_pre]:overflow-x-auto
          [&_.ProseMirror_hr]:border-base-300
          [&_.ProseMirror_hr]:my-4
        "
      />
    </div>
  )
}
