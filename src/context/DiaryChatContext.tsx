import { createContext, useContext, useState, ReactNode } from 'react'

export interface ChatMessage {
  id: string
  user: string
  text: string
  at: string
  self: boolean
}

// One chat room per diary — keyed by diaryId
type ChatStore = Record<string, ChatMessage[]>

const INITIAL: ChatStore = {
  '1': [
    { id: 'm1', user: 'Maria', text: 'I added something at the top 💕',        at: '2026-08-29T20:23:00', self: false },
    { id: 'm2', user: 'You',   text: "Oh I saw that, it's so sweet hehe",       at: '2026-08-29T20:24:30', self: true  },
    { id: 'm3', user: 'Maria', text: "Don't delete it ok 🥺",                   at: '2026-08-29T20:25:00', self: false },
    { id: 'm4', user: 'You',   text: "Never! I'll write below yours then 😊",   at: '2026-08-29T21:06:00', self: true  },
    { id: 'm5', user: 'Maria', text: 'Also can we add our photo here? 📸',      at: '2026-08-29T21:10:00', self: false },
  ],
}

interface DiaryChatContextValue {
  getMessages: (diaryId: string) => ChatMessage[]
  sendMessage: (diaryId: string, text: string) => void
}

const DiaryChatContext = createContext<DiaryChatContextValue | null>(null)

export function DiaryChatProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ChatStore>(INITIAL)

  function getMessages(diaryId: string): ChatMessage[] {
    return store[diaryId] ?? []
  }

  function sendMessage(diaryId: string, text: string) {
    const msg: ChatMessage = {
      id: `m${Date.now()}`,
      user: 'You',
      text,
      at: new Date().toISOString(),
      self: true,
    }
    setStore(prev => ({
      ...prev,
      [diaryId]: [...(prev[diaryId] ?? []), msg],
    }))
  }

  return (
    <DiaryChatContext.Provider value={{ getMessages, sendMessage }}>
      {children}
    </DiaryChatContext.Provider>
  )
}

export function useDiaryChat() {
  const ctx = useContext(DiaryChatContext)
  if (!ctx) throw new Error('useDiaryChat must be used inside DiaryChatProvider')
  return ctx
}
