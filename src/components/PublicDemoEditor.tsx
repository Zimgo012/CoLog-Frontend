import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import * as Y from 'yjs'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8083'

type ConnectionState = 'connecting' | 'connected' | 'offline'

const UPDATE = 1
const STATE_VECTOR = 2
const UPDATE_DEBOUNCE_MS = 2000
const UPDATE_MAX_WAIT_MS = 8000

function packet(kind: number, content: Uint8Array): number[] {
  return [kind, ...content]
}

function decodePacket(body: string): Uint8Array | null {
  try {
    const parsed: unknown = JSON.parse(body)
    if (Array.isArray(parsed)) return new Uint8Array(parsed as number[])
    // Spring's default JSON representation for a byte[] is often a base64 string.
    if (typeof parsed === 'string') {
      const binary = atob(parsed)
      return Uint8Array.from(binary, char => char.charCodeAt(0))
    }
  } catch {
    // A broker may pass a base64 byte[] through without JSON encoding.
    try {
      const binary = atob(body)
      return Uint8Array.from(binary, char => char.charCodeAt(0))
    } catch { return null }
  }
  return null
}

/** A public, in-memory Yjs collaboration demo. It never requires an account. */
export default function PublicDemoEditor() {
  const [value, setValue] = useState('')
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [error, setError] = useState<string | null>(null)
  const textRef = useRef<Y.Text | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    const text = doc.getText('demo')
    textRef.current = text
    const remoteOrigin = Symbol('remote-demo-update')
    let isActive = true
    let updateTimer: ReturnType<typeof setTimeout> | null = null
    let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
    let pendingUpdates: Uint8Array[] = []

    const refresh = () => {
      if (isActive) setValue(text.toString())
    }
    text.observe(refresh)

    const client = new Client({
      brokerURL: `${WS_URL}/ws`,
      reconnectDelay: 5000,
      debug: (message) => console.debug('[Public demo STOMP]', message),
      onConnect: () => {
        if (!isActive) return
        setConnection('connected')
        setError(null)
        client.subscribe('/demo', (message) => {
          const incoming = decodePacket(message.body)
          if (!incoming || incoming.length < 2) return

          const kind = incoming[0]
          const payload = incoming.slice(1)
          try {
            if (kind === STATE_VECTOR) {
              // A newly connected tab asks an existing tab for only the changes it lacks.
              const update = Y.encodeStateAsUpdate(doc, payload)
              client.publish({ destination: '/app/demo', body: JSON.stringify(packet(UPDATE, update)) })
            } else if (kind === UPDATE) {
              Y.applyUpdate(doc, payload, remoteOrigin)
            }
          } catch (cause) {
            console.warn('[Public demo] ignored malformed Yjs packet', cause)
          }
        })

        // The endpoint transports byte arrays, so prefix the byte[] with a tiny
        // packet type. This lets live peers reply with their current Yjs state.
        client.publish({
          destination: '/app/demo',
          body: JSON.stringify(packet(STATE_VECTOR, Y.encodeStateVector(doc))),
        })
        // This also shares edits made while the socket was still connecting.
        client.publish({
          destination: '/app/demo',
          body: JSON.stringify(packet(UPDATE, Y.encodeStateAsUpdate(doc))),
        })
      },
      onDisconnect: () => setConnection('offline'),
      onStompError: (frame) => {
        setConnection('offline')
        setError(frame.headers.message ?? 'The public demo connection was rejected.')
      },
      onWebSocketError: () => {
        setConnection('offline')
        setError('Unable to connect to the public demo.')
      },
    })

    const flushUpdates = () => {
      clearTimeout(updateTimer ?? undefined)
      updateTimer = null
      clearTimeout(maxWaitTimer ?? undefined)
      maxWaitTimer = null
      if (pendingUpdates.length === 0 || !client.connected) return
      const merged = Y.mergeUpdates(pendingUpdates)
      pendingUpdates = []
      client.publish({ destination: '/app/demo', body: JSON.stringify(packet(UPDATE, merged)) })
    }

    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === remoteOrigin || !client.connected) return
      pendingUpdates.push(update)
      clearTimeout(updateTimer ?? undefined)
      updateTimer = setTimeout(flushUpdates, UPDATE_DEBOUNCE_MS)
      // Do not let continuous typing postpone synchronization forever.
      if (!maxWaitTimer) maxWaitTimer = setTimeout(flushUpdates, UPDATE_MAX_WAIT_MS)
    }
    doc.on('update', onUpdate)
    client.activate()

    return () => {
      isActive = false
      clearTimeout(updateTimer ?? undefined)
      clearTimeout(maxWaitTimer ?? undefined)
      flushUpdates()
      text.unobserve(refresh)
      doc.off('update', onUpdate)
      textRef.current = null
      client.deactivate()
      doc.destroy()
    }
  }, [])

  const edit = (nextValue: string) => {
    const text = textRef.current
    if (!text) return
    text.doc?.transact(() => {
      text.delete(0, text.length)
      text.insert(0, nextValue)
    })
  }

  const status = connection === 'connected'
    ? 'Live collaboration is on'
    : connection === 'connecting' ? 'Connecting to the demo…' : 'Trying to reconnect…'

  return (
    <section className="w-full max-w-3xl text-left" aria-label="Live collaboration demo">
      <div className="card bg-base-100 border border-base-300 shadow-xl overflow-hidden">
        <div className="flex flex-col items-start gap-2 px-5 py-3 border-b border-base-200 bg-base-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-base-content">Try live collaboration</h2>
            <p className="text-xs text-base-content/60">Open this page in another tab and edit together.</p>
          </div>
          <span className={`badge h-auto max-w-full gap-1 whitespace-normal py-1.5 text-left ${connection === 'connected' ? 'badge-success' : 'badge-ghost'}`}>
            <span className={`w-2 h-2 rounded-full ${connection === 'connected' ? 'bg-success-content animate-pulse' : 'bg-base-content/40'}`} />
            {status}
          </span>
        </div>
        <textarea
          value={value}
          onChange={(event) => edit(event.target.value)}
          className="textarea textarea-ghost w-full min-h-52 rounded-none resize-y text-base leading-relaxed focus:outline-none"
          placeholder="Start typing here — everyone viewing this public demo will see your changes."
          aria-label="Shared public demo editor"
        />
        {error && <p className="px-5 pb-3 text-xs text-error">{error}</p>}
      </div>
    </section>
  )
}
