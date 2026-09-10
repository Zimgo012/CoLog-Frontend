import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { connectNotificationSession } from "../api/websocket"

export interface UserNotification {
  id:      string
  message: string
  tone:    "success" | "warning" | "info"
  diaryId?: number
  isRemoval: boolean
}

interface NotificationContextValue {
  dismissNotification: (id: string) => void
  lastNotification: UserNotification | null
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function normaliseNotification(payload: unknown): Omit<UserNotification, "id"> {
  if (typeof payload === "string") {
    return { message: payload, tone: "info", isRemoval: payload.toLowerCase().includes("removed") }
  }

  const data = payload as Record<string, any> | null
  const type = String(data?.type ?? data?.eventType ?? data?.notificationType ?? "").toLowerCase()
  const rawDiaryId = data?.diaryId ?? data?.diary?.diaryId ?? data?.diary?.id
  const diaryId = Number.isFinite(Number(rawDiaryId)) ? Number(rawDiaryId) : undefined
  const diaryTitle = data?.diaryTitle ?? data?.diaryName ?? data?.diary?.title
  const diaryLabel = diaryTitle || (diaryId ? `Diary #${diaryId}` : "this diary")
  const ownerUsername = data?.diaryOwnerName ?? data?.ownerUsername ?? data?.diaryOwnerUsername ?? data?.owner?.username ?? data?.owner
  const ownerLabel = typeof ownerUsername === "string" && ownerUsername.trim()
    ? ` by ${ownerUsername.replace(/^@/, "")}`
    : ""
  const message = data?.message ?? data?.content ?? data?.notification
  const messageText = typeof message === "string" ? message.toLowerCase() : ""
  const isRemoval = type.includes("remove") || messageText.includes("removed")
  const isAddition = type.includes("add") || type.includes("collaborator") || type.includes("invite")

  if (isRemoval) {
    return { message: `You are removed from ${diaryLabel}${ownerLabel}.`, tone: "warning", diaryId, isRemoval: true }
  }

  if (isAddition) {
    return { message: `You are added as a collaborator to ${diaryLabel}${ownerLabel}.`, tone: "success", diaryId, isRemoval: false }
  }

  if (typeof message === "string") {
    return { message: `${message} (${diaryLabel})`, tone: "info", diaryId, isRemoval: false }
  }

  return { message: `You have a new notification for ${diaryLabel}.`, tone: "info", diaryId, isRemoval: false }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [lastNotification, setLastNotification] = useState<UserNotification | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const locationRef = useRef(location.pathname)

  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  function dismissNotification(id: string) {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  useEffect(() => {
    if (!isAuthenticated) return

    const notificationSession = connectNotificationSession(payload => {
      const notification = { id: crypto.randomUUID(), ...normaliseNotification(payload) }
      const currentDiaryId = Number(locationRef.current.match(/^\/diary\/(\d+)(?:\/|$)/)?.[1])
      const isViewingRemovedDiary =
        notification.isRemoval &&
        Boolean(currentDiaryId) &&
        (!notification.diaryId || notification.diaryId === currentDiaryId)

      if (isViewingRemovedDiary) {
        navigate("/diary", { replace: true })
      }

      setNotifications(prev => [...prev, notification])
      setLastNotification(notification)

      const timer = setTimeout(() => dismissNotification(notification.id), 6000)
      timersRef.current.push(timer)
    })

    return () => {
      notificationSession.disconnect()
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current = []
    }
  }, [isAuthenticated, navigate])

  return (
    <NotificationContext.Provider value={{ dismissNotification, lastNotification }}>
      {children}

      {notifications.length > 0 && (
        <div className="toast toast-top toast-end z-[9999] pt-20">
          {notifications.map(notification => (
            <div key={notification.id} className={`alert alert-${notification.tone} shadow-lg max-w-sm`}>
              <span className="text-sm">{notification.message}</span>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="Dismiss notification"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotifications must be used inside NotificationProvider")
  return context
}
