/**
 * CollabEditor — ProseMirror + YJS collaborative editor.
 *
 * Mirrors stomp2.html exactly: creates its own STOMP client,
 * subscribes to YJS/Presence topics inside onConnect,
 * publishes to /app/diary/session/{diaryId}.
 */
import { useEffect, useRef } from 'react'
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

// ── Colour per user ───────────────────────────────────────────────────────────
function userColor(userId: number): string {
  const p = ['#ef4444','#3b82f6','#22c55e','#a855f7','#f97316','#14b8a6','#92400e']
  return p[Math.abs(userId) % p.length]
}

// ── Byte helpers ──────────────────────────────────────────────────────────────
function decodeBytes(value: unknown): Uint8Array | null {
  if (typeof value === 'string') {
    try { const b = atob(value); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u } catch { return null }
  }
  if (Array.isArray(value))           { try { return new Uint8Array(value as number[]) } catch { return null } }
  if (value instanceof Uint8Array)     return value
  if (value instanceof ArrayBuffer)    return new Uint8Array(value)
  return null
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CollabEditorProps {
  diaryId:    number
  documentId: number
  userId:     number
  userName:   string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CollabEditor({ diaryId, documentId, userId, userName }: CollabEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // ── 1. YDoc + Awareness ───────────────────────────────────────────────
    const ydoc     = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(ydoc)
    const yXml     = ydoc.getXmlFragment('prosemirror')

    // ── 2. Persistence ────────────────────────────────────────────────────
    const token = localStorage.getItem('token') ?? ''
    let saveTimer: ReturnType<typeof setTimeout> | null = null

    function scheduleSave() {
      clearTimeout(saveTimer ?? undefined)
      saveTimer = setTimeout(async () => {
        saveTimer = null
        try {
          const state = Y.encodeStateAsUpdate(ydoc)
          await fetch(`${API_URL}/document/${diaryId}/${documentId}/yjs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
            body: state,
          })
        } catch (e) { console.error('[CollabEditor] save error', e) }
      }, 2000)
    }

    // ── 3. EditorState + View (created before STOMP) ──────────────────────
    let editorView: EditorView | null = null
    let currentState: EditorState
    let typingTimer: ReturnType<typeof setTimeout> | null = null

    // Cursor sync helpers
    function getBinding() {
      if (!editorView?.state) return null
      try { return ySyncPluginKey.getState(editorView.state)?.binding ?? null } catch { return null }
    }
    function syncCursor() {
      const binding = getBinding()
      if (!binding || !editorView?.state) return
      try {
        const { from, to } = editorView.state.selection
        const ar = absolutePositionToRelativePosition(from, binding.type, binding.mapping)
        const hr = absolutePositionToRelativePosition(to,   binding.type, binding.mapping)
        awareness.setLocalStateField('cursor', {
          anchor: Array.from(Y.encodeRelativePosition(ar)),
          head:   Array.from(Y.encodeRelativePosition(hr)),
        })
      } catch { /* not ready yet */ }
    }

    // Provide getCursorPosition for presencePlugin
    const providerLike = {
      getUsers:       () => awareness.getStates(),
      getClientId:    () => awareness.clientID,
      getAwareness:   () => awareness,
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

    // Set user awareness
    awareness.setLocalStateField('user', { id: userId, name: userName, color: userColor(userId) })

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

    // Use a ref box so dispatchTransaction always has the current view
    // even during the closure lifetime, without relying on the outer variable.
    const viewBox = { current: null as EditorView | null }

    editorView = new EditorView(mountRef.current, {
      state: currentState,
      dispatchTransaction(tr) {
        if (!viewBox.current) return
        currentState = currentState.apply(tr)
        viewBox.current.updateState(currentState)
        setTimeout(syncCursor, 0)
      },
      handleDOMEvents: {
        input:   () => { awareness.setLocalStateField('typing', true); clearTimeout(typingTimer ?? undefined); typingTimer = setTimeout(() => awareness.setLocalStateField('typing', false), 1000); return false },
        click:   () => { setTimeout(syncCursor, 0); return false },
        keyup:   () => { setTimeout(syncCursor, 0); return false },
        mouseup: () => { setTimeout(syncCursor, 0); return false },
      },
    })
    viewBox.current = editorView

    // Rebuild remote cursors when awareness changes
    awareness.on('change', () => {
      if (!editorView?.state) return
      const tr = editorView.state.tr
      tr.setMeta(presencePluginKey, true)
      editorView.dispatch(tr)
    })

    // ── 4. STOMP client — mirrors stomp2.html connect() exactly ──────────
    let pendingYjs: Uint8Array[] = []
    let initializing = true

    const stomp = new Client({
      brokerURL: `${WS_URL}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        diaryId: String(diaryId),
      },
      reconnectDelay: 5000,
      debug: (msg) => console.debug('[CollabEditor STOMP]', msg),

      onConnect() {
        console.log('[CollabEditor] STOMP connected')

        // ── Subscribe YJS (/topic/diary/{diaryId}/documentId/{docId}/yjs)
        stomp.subscribe(
          `/topic/diary/${diaryId}/documentId/${documentId}/yjs`,
          (msg) => {
            try {
              const data    = JSON.parse(msg.body)
              const payload = data.payload ?? data
              const update  = decodeBytes(payload.yjs)
              if (!update) return
              if (initializing) { pendingYjs.push(update); return }
              Y.applyUpdate(ydoc, update, stomp)
            } catch (e) { console.error('[CollabEditor] YJS msg error', e) }
          }
        )

        // ── Subscribe Presence (/topic/diary/{diaryId}/documentId/{docId}/presence)
        stomp.subscribe(
          `/topic/diary/${diaryId}/documentId/${documentId}/presence`,
          (msg) => {
            try {
              const data    = JSON.parse(msg.body)
              const payload = data.payload ?? data
              const update  = decodeBytes(payload.awareness)
              if (!update) return
              awarenessProtocol.applyAwarenessUpdate(awareness, update, stomp)
            } catch (e) { console.error('[CollabEditor] Presence msg error', e) }
          }
        )

        // ── Load DB snapshot then drain buffered live updates ─────────────
        fetch(`${API_URL}/document/${diaryId}/${documentId}/yjs`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (res) => {
            if (res.ok) {
              const saved = new Uint8Array(await res.arrayBuffer())
              if (saved.length > 0) Y.applyUpdate(ydoc, saved, stomp)
            }
          })
          .catch((e) => console.warn('[CollabEditor] No saved YJS state:', e))
          .finally(() => {
            // Drain buffered live updates received during fetch
            for (const u of pendingYjs) Y.applyUpdate(ydoc, u, stomp)
            pendingYjs = []
            initializing = false
          })

        // ── Outgoing YJS updates ──────────────────────────────────────────
        ydoc.on('update', (update: Uint8Array, origin: unknown) => {
          if (origin === stomp) return // remote update — don't re-broadcast
          if (!stomp.connected) return
          stomp.publish({
            destination: `/app/diary/session/${diaryId}`,
            body: JSON.stringify({
              type: 'YJSUPDATE',
              payload: { senderId: userId, documentId, yjs: Array.from(update) },
            }),
          })
          scheduleSave()
        })

        // ── Outgoing Presence (awareness) updates ─────────────────────────
        awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
          if (origin === stomp) return
          const changed = [...added, ...updated, ...removed]
          if (changed.length === 0 || !stomp.connected) return
          const enc = awarenessProtocol.encodeAwarenessUpdate(awareness, changed)
          stomp.publish({
            destination: `/app/diary/session/${diaryId}`,
            body: JSON.stringify({
              type: 'PRESENCE',
              payload: { senderId: userId, documentId, awareness: Array.from(enc) },
            }),
          })
        })
      },

      onStompError:    (f) => console.error('[CollabEditor] STOMP error', f.headers, f.body),
      onWebSocketError:(e) => console.error('[CollabEditor] WS error', e),
    })

    stomp.activate()

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      clearTimeout(saveTimer   ?? undefined)
      clearTimeout(typingTimer ?? undefined)
      try { awareness.setLocalState(null) } catch { /* ignore */ }
      viewBox.current = null   // stop any in-flight dispatchTransaction
      editorView?.destroy()
      awareness.destroy()
      ydoc.destroy()
      stomp.deactivate()
    }
  }, [diaryId, documentId, userId, userName])

  return (
    <div ref={mountRef} className="collab-editor-mount" />
  )
}
