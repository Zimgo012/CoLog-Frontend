import {
    createContext,
    useContext,
    useRef,
    useState,
    useCallback,
    type ReactNode,
} from 'react'
import {
    connectDiarySession,
    type ChatMessage,
    type StompStatus,
    type DiarySessionHandle,
} from '../api/websocket'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiarySessionContextValue {
    /** Open (or reuse) the STOMP session for a diary. Call on mount of DiaryPages. */
    openSession:    (diaryId: number) => void
    /** Disconnect and clear state. Call when navigating away from the diary entirely. */
    closeSession:   ()                => void
    /** Current STOMP connection status. */
    wsStatus:       StompStatus
    /** Accumulated chat messages for the active diary. */
    chatMessages:   ChatMessage[]
    /** Send a chat message. */
    sendChat:       (senderId: number, documentId: number, content: string) => void
    /** Expose the raw session handle for advanced use (YJS, presence, etc.) */
    session:        DiarySessionHandle | null
}

// ── Context ───────────────────────────────────────────────────────────────────

const DiarySessionContext = createContext<DiarySessionContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function DiarySessionProvider({ children }: { children: ReactNode }) {
    const sessionRef    = useRef<DiarySessionHandle | null>(null)
    const unsubChatRef  = useRef<(() => void) | null>(null)
    // Track which diaryId the session belongs to so we don't reconnect needlessly
    const activeDiaryId = useRef<number | null>(null)

    const [wsStatus, setWsStatus]       = useState<StompStatus>('disconnected')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

    const openSession = useCallback((diaryId: number) => {
        // Already connected to this diary — nothing to do
        if (activeDiaryId.current === diaryId && sessionRef.current) return

        // Tear down any previous session first
        unsubChatRef.current?.()
        sessionRef.current?.disconnect()

        activeDiaryId.current = diaryId
        setChatMessages([])
        setWsStatus('connecting')

        const session = connectDiarySession(diaryId, setWsStatus)
        sessionRef.current = session

        unsubChatRef.current = session.onChat(msg => {
            setChatMessages(prev => [...prev, msg])
        })
    }, [])

    const closeSession = useCallback(() => {
        unsubChatRef.current?.()
        sessionRef.current?.disconnect()
        unsubChatRef.current  = null
        sessionRef.current    = null
        activeDiaryId.current = null
        setChatMessages([])
        setWsStatus('disconnected')
    }, [])

    const sendChat = useCallback((senderId: number, documentId: number, content: string) => {
        sessionRef.current?.sendChat(senderId, documentId, content)
    }, [])

    return (
        <DiarySessionContext.Provider value={{
            openSession,
            closeSession,
            wsStatus,
            chatMessages,
            sendChat,
            session: sessionRef.current,
        }}>
            {children}
        </DiarySessionContext.Provider>
    )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDiarySession(): DiarySessionContextValue {
    const ctx = useContext(DiarySessionContext)
    if (!ctx) throw new Error('useDiarySession must be used inside DiarySessionProvider')
    return ctx
}
