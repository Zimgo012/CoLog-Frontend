import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import {
  ySyncPluginKey,
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from 'y-prosemirror'
import type { EditorView } from 'prosemirror-view'

const API_URL = import.meta.env.VITE_API_URL as string

// ── Transport interface ───────────────────────────────────────────────────────
// Minimal abstraction over the DiarySessionHandle so YjsStompProvider
// doesn't depend on a raw STOMP Client.

export interface YjsTransport {
  /** Subscribe to incoming raw YJS payloads for a document. Returns unsubscribe fn. */
  onYjs(documentId: number, cb: (body: unknown) => void): () => void
  /** Subscribe to incoming raw Presence payloads for a document. Returns unsubscribe fn. */
  onPresence(documentId: number, cb: (body: unknown) => void): () => void
  /** Send a YJS update. */
  sendYjsUpdate(senderId: number, documentId: number, yjs: number[]): void
  /** Send a Presence update. */
  sendPresence(senderId: number, documentId: number, awareness: number[]): void
}

// ── Provider ──────────────────────────────────────────────────────────────────

export default class YjsStompProvider {
  ydoc:      Y.Doc
  awareness: awarenessProtocol.Awareness

  private transport:   YjsTransport
  private diaryId:     number
  private documentId:  number
  private senderId:    number | null = null
  private editorView:  EditorView | null = null

  private unsubYjs:      (() => void) | null = null
  private unsubPresence: (() => void) | null = null
  private handleUpdate:  ((update: Uint8Array, origin: unknown) => void) | null = null
  private handleAwareness: ((
    changed: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => void) | null = null

  private initializing   = true
  private pendingUpdates: Uint8Array[] = []

  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private saveDelay = 2000

  destroyed = false

  constructor(ydoc: Y.Doc, transport: YjsTransport, diaryId: number, documentId: number) {
    this.ydoc       = ydoc
    this.transport  = transport
    this.diaryId    = diaryId
    this.documentId = documentId
    this.awareness  = new awarenessProtocol.Awareness(ydoc)

    this.subscribeYjs()
    this.setupUpdateListener()
    this.subscribePresence()
    this.setupAwarenessListener()
  }

  // ── EditorView ──────────────────────────────────────────────────────────────

  setEditorView(view: EditorView) {
    if (this.destroyed) return
    this.editorView = view
  }

  getEditorView(): EditorView | null { return this.editorView }

  // ── YJS / ProseMirror binding ───────────────────────────────────────────────

  private getBinding() {
    if (this.destroyed || !this.editorView?.state) return null
    try {
      const s = ySyncPluginKey.getState(this.editorView.state)
      return s?.binding ?? null
    } catch { return null }
  }

  // ── Subscribe to incoming YJS updates ──────────────────────────────────────

  private subscribeYjs() {
    if (this.destroyed) return
    this.unsubYjs = this.transport.onYjs(this.documentId, (body) => {
      if (this.destroyed) return
      try {
        // body arrives already JSON-parsed by websocket.ts addSubscription
        const payload = (body as any)?.payload ?? body
        const update  = this.decodeBytes(payload?.yjs)
        if (!update) return
        if (this.initializing) { this.pendingUpdates.push(update); return }
        Y.applyUpdate(this.ydoc, update, this)
      } catch (err) {
        console.error('[YjsProvider] YJS update error:', err)
      }
    })
  }

  // ── Initialize from DB snapshot ─────────────────────────────────────────────

  initialize(savedState: Uint8Array | null) {
    if (this.destroyed) return
    if (savedState && savedState.length > 0) {
      Y.applyUpdate(this.ydoc, savedState, this)
    }
    for (const update of this.pendingUpdates) {
      if (this.destroyed) return
      Y.applyUpdate(this.ydoc, update, this)
    }
    this.pendingUpdates = []
    this.initializing   = false
  }

  // ── Send outgoing YJS updates ───────────────────────────────────────────────

  private setupUpdateListener() {
    this.handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (this.destroyed || origin === this) return
      this.transport.sendYjsUpdate(
        this.senderId ?? 0,
        this.documentId,
        Array.from(update)
      )
      this.scheduleSave()
    }
    this.ydoc.on('update', this.handleUpdate)
  }

  // ── Subscribe to incoming Presence updates ──────────────────────────────────

  private subscribePresence() {
    if (this.destroyed) return
    this.unsubPresence = this.transport.onPresence(this.documentId, (body) => {
      if (this.destroyed) return
      try {
        const payload = (body as any)?.payload ?? body
        const update  = this.decodeBytes(payload?.awareness)
        if (!update) return
        awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this)
      } catch (err) {
        console.error('[YjsProvider] Presence update error:', err)
      }
    })
  }

  // ── Send outgoing Presence updates ─────────────────────────────────────────

  private setupAwarenessListener() {
    this.handleAwareness = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (this.destroyed || origin === this) return
      const changed = [...added, ...updated, ...removed]
      if (changed.length === 0) return
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed)
      this.transport.sendPresence(
        this.senderId ?? 0,
        this.documentId,
        Array.from(update)
      )
    }
    this.awareness.on('update', this.handleAwareness)
  }

  // ── User identity ───────────────────────────────────────────────────────────

  setUser(userId: number, name: string, color: string) {
    if (this.destroyed) return
    this.senderId = userId
    this.awareness.setLocalStateField('user', { id: userId, name, color })
  }

  // ── Cursor (ProseMirror pos ↔ YJS RelativePosition) ────────────────────────

  setCursor(anchor: number, head: number) {
    if (this.destroyed) return
    const binding = this.getBinding()
    if (!binding) return
    try {
      const ar = absolutePositionToRelativePosition(anchor, binding.type, binding.mapping)
      const hr = absolutePositionToRelativePosition(head,   binding.type, binding.mapping)
      this.awareness.setLocalStateField('cursor', {
        anchor: Array.from(Y.encodeRelativePosition(ar)),
        head:   Array.from(Y.encodeRelativePosition(hr)),
      })
    } catch (err) {
      console.error('[YjsProvider] setCursor error:', err)
    }
  }

  getCursorPosition(cursor: { anchor: number[]; head: number[] }) {
    if (!cursor) return null
    const binding = this.getBinding()
    if (!binding) return null
    try {
      const ab = this.toUint8Array(cursor.anchor)
      const hb = this.toUint8Array(cursor.head)
      if (!ab || !hb) return null
      const anchor = relativePositionToAbsolutePosition(
        this.ydoc, binding.type, Y.decodeRelativePosition(ab), binding.mapping
      )
      const head = relativePositionToAbsolutePosition(
        this.ydoc, binding.type, Y.decodeRelativePosition(hb), binding.mapping
      )
      if (anchor == null || head == null) return null
      return { anchor, head }
    } catch { return null }
  }

  // ── Typing indicator ────────────────────────────────────────────────────────

  setTyping(typing: boolean) {
    if (this.destroyed) return
    this.awareness.setLocalStateField('typing', typing)
  }

  // ── Awareness accessors ─────────────────────────────────────────────────────

  getUsers()     { return this.awareness.getStates() }
  getAwareness() { return this.awareness }
  getClientId()  { return this.awareness.clientID }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private scheduleSave() {
    if (this.destroyed) return
    clearTimeout(this.saveTimer ?? undefined)
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.saveState() }, this.saveDelay)
  }

  async flushSave() {
    if (this.destroyed) return
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null }
    await this.saveState()
  }

  private async saveState() {
    if (this.destroyed) return
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc)
      const token = localStorage.getItem('token') ?? ''
      const res = await fetch(`${API_URL}/document/${this.diaryId}/${this.documentId}/yjs`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
        body:    state.buffer as ArrayBuffer,
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
    } catch (err) {
      console.error('[YjsProvider] saveState error:', err)
    }
  }

  static async loadYjsState(diaryId: number, documentId: number): Promise<Uint8Array> {
    const token = localStorage.getItem('token') ?? ''
    const res = await fetch(`${API_URL}/document/${diaryId}/${documentId}/yjs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Failed to load YJS state: ${res.status}`)
    return new Uint8Array(await res.arrayBuffer())
  }

  // ── Byte helpers ─────────────────────────────────────────────────────────────

  private decodeBytes(value: unknown): Uint8Array | null {
    if (typeof value === 'string') {
      try { return this.base64ToUint8Array(value) } catch { return null }
    }
    if (Array.isArray(value))           { try { return new Uint8Array(value) } catch { return null } }
    if (value instanceof Uint8Array)     return value
    if (value instanceof ArrayBuffer)    return new Uint8Array(value)
    return null
  }

  private toUint8Array(value: unknown): Uint8Array | null {
    if (value instanceof Uint8Array)  return value
    if (value instanceof ArrayBuffer) return new Uint8Array(value)
    if (Array.isArray(value))          { try { return new Uint8Array(value) } catch { return null } }
    if (typeof value === 'string')     { try { return this.base64ToUint8Array(value) } catch { return null } }
    return null
  }

  private base64ToUint8Array(b64: string): Uint8Array {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  // ── Destroy ──────────────────────────────────────────────────────────────────

  destroy() {
    if (this.destroyed) return
    this.awareness.setLocalState(null)
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null }
    this.unsubYjs?.();      this.unsubYjs      = null
    this.unsubPresence?.(); this.unsubPresence = null
    if (this.handleUpdate)   { this.ydoc.off('update', this.handleUpdate);         this.handleUpdate   = null }
    if (this.handleAwareness){ this.awareness.off('update', this.handleAwareness); this.handleAwareness = null }
    this.awareness.destroy()
    this.pendingUpdates = []
    this.editorView     = null
    this.senderId       = null
    this.destroyed      = true
  }
}
