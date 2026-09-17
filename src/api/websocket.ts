import { Client, type StompSubscription } from "@stomp/stompjs";

const WS_URL = import.meta.env.VITE_WS_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

export type StompStatus = "connecting" | "connected" | "disconnected" | "error";

export interface ChatMessage {
    documentId: number
    senderId:   number
    senderName: string
    content:    string
    timestamp:  string
}

export interface DiarySessionHandle {
    get status(): StompStatus
    /** Send a CHAT message. */
    sendChat: (senderId: number, documentId: number, content: string) => void
    /** Send a PRESENCE update for a document. */
    sendPresence:  (senderId: number, documentId: number, awareness: any[]) => void
    /** Send a YJS update for a document. */
    sendYjsUpdate: (senderId: number, documentId: number, yjs: number[])    => void
    /** Subscribe to incoming chat messages. Returns unsubscribe fn. */
    onChat:        (cb: (msg: ChatMessage) => void)                         => () => void
    /** Subscribe to presence updates for a document. Returns unsubscribe fn. */
    onPresence:    (documentId: number, cb: (body: unknown) => void)        => () => void
    /** Subscribe to YJS updates for a document. Returns unsubscribe fn. */
    onYjs:         (documentId: number, cb: (body: unknown) => void)        => () => void
    /** Disconnect and clean up everything. */
    disconnect:    ()                                                       => void
}

export interface NotificationSessionHandle {
    disconnect: () => void
}

// ── Internal ──────────────────────────────────────────────────────────────────

/** All messages are published here*/
function destination(diaryId: number) {
    return `/app/diary/session/${diaryId}`;
}

/** Opens the authenticated user-notification WebSocket used by DiaryList. */
export function connectNotificationSession(
    onNotification: (body: unknown) => void,
): NotificationSessionHandle {
    const token = localStorage.getItem("token") ?? "";
    let notificationSub: StompSubscription | null = null;

    const client = new Client({
        brokerURL: `${WS_URL}/ws`,
        connectHeaders: {
            Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 5000,
        debug: (msg) => console.debug("[STOMP notification]", msg),

        onConnect: () => {
            console.log("[STOMP] connected — notifications");
            notificationSub = client.subscribe("/user/queue/notification", (message) => {
                try {
                    const payload = JSON.parse(message.body);
                    onNotification(payload);
                } catch (err) {
                    console.error("[STOMP] failed to parse notification", err);
                }
            });
        },

        onStompError: (frame) => {
            console.error("[STOMP] notification error:", frame.headers, frame.body);
        },

        onWebSocketError: (err) => {
            console.error("[STOMP] notification WebSocket error:", err);
        },
    });

    client.activate();

    return {
        disconnect() {
            try { notificationSub?.unsubscribe(); } catch { /* ignore */ }
            client.deactivate();
        },
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Opens a STOMP-over-WebSocket connection for a diary session.
 *
 * Matches stomp2.html exactly:
 *   brokerURL    : ws://…/ws
 *   connectHeaders: { Authorization: "Bearer <jwt>", diaryId: "<id>" }
 *   auto-subscribe: /topic/diary/{diaryId}/chat  (on connect)
 *   all publishes : /app/diary/session/{diaryId} with { type, payload }
 */
export function connectDiarySession(
    diaryId: number,
    onStatusChange?: (s: StompStatus) => void,
    onError?: (message: string) => void,
): DiarySessionHandle {

    let status: StompStatus = "connecting";
    const subscriptions: StompSubscription[] = [];
    const chatCallbacks = new Set<(msg: ChatMessage) => void>();

    function setStatus(s: StompStatus) {
        status = s;
        onStatusChange?.(s);
    }

    const token = localStorage.getItem("token") ?? "";

    function stompErrorMessage(body: string, fallback: string) {
        try {
            const parsed: unknown = JSON.parse(body)
            if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
                return parsed.message
            }
        } catch {
            // Until the backend serializes STOMP errors, broker bodies can be plain text.
        }
        return body.trim() || fallback
    }

    // ── STOMP client
    const client = new Client({
        brokerURL: `${WS_URL}/ws`,

        // JWT + diaryId in connect headers — exactly as in stomp2.html
        connectHeaders: {
            Authorization: `Bearer ${token}`,
            diaryId:       String(diaryId),
        },

        reconnectDelay: 5000,

        debug: (msg) => console.debug("[STOMP]", msg),

        onConnect: () => {
            console.log("[STOMP] connected — diary", diaryId);
            setStatus("connected");

            // Auto-subscribe to chat — mirrors subscribeChat() in stomp2.html
            const chatSub = client.subscribe(
                `/topic/diary/${diaryId}/chat`,
                (message) => {
                    try {
                        const chat: ChatMessage = JSON.parse(message.body);
                        chatCallbacks.forEach(cb => cb(chat));
                    } catch (err) {
                        console.error("[STOMP] failed to parse chat", err);
                    }
                }
            );
            subscriptions.push(chatSub);

        },

        onDisconnect: () => {
            console.log("[STOMP] disconnected — diary", diaryId);
            setStatus("disconnected");
        },

        onStompError: (frame) => {
            console.error("[STOMP] error:", frame.headers, frame.body);
            setStatus("error");
            onError?.(stompErrorMessage(frame.body, "The collaboration connection was rejected."));
        },

        onWebSocketError: (err) => {
            console.error("[STOMP] WebSocket error:", err);
            setStatus("error");
            onError?.("Unable to connect to collaboration. Please try again.");
        },
    });

    client.activate();

    // ── Generic publish — mirrors sendRaw()
    function sendRaw(type: string, payload: unknown) {
        if (!client.connected) {
            console.warn("[STOMP] not connected — message dropped:", type);
            return;
        }
        client.publish({
            destination: destination(diaryId),
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type, payload }),
        });
    }

    // ── Generic subscribe helper ──────────────────────────────────────────
    function addSubscription(topic: string, cb: (body: unknown) => void): () => void {
        const sub = client.subscribe(topic, (msg) => {
            try   { cb(JSON.parse(msg.body)); }
            catch { cb(msg.body); }
        });
        subscriptions.push(sub);
        return () => sub.unsubscribe();
    }

    // ── Handle ────────────────────────────────────────────────────────────
    return {
        get status() { return status; },

        // mirrors sendChat()
        sendChat(senderId: number, documentId: number, content: string) {
            sendRaw("CHAT", { documentId, content, senderId });
        },

        // mirrors sendPresence()
        sendPresence(senderId: number, documentId: number, awareness: any[]) {
            sendRaw("PRESENCE", { senderId, documentId, awareness });
        },

        // mirrors sendYjsUpdate()
        sendYjsUpdate(senderId: number, documentId: number, yjs: number[]) {
            sendRaw("YJSUPDATE", { senderId, documentId, yjs });
        },

        // mirrors subscribeChat() listener
        onChat(cb: (msg: ChatMessage) => void) {
            chatCallbacks.add(cb);
            return () => chatCallbacks.delete(cb);
        },

        // mirrors subscribePresence()
        onPresence(documentId: number, cb: (body: unknown) => void) {
            return addSubscription(
                `/topic/diary/${diaryId}/documentId/${documentId}/presence`,
                cb
            );
        },

        // mirrors subscribeYjs()
        onYjs(documentId: number, cb: (body: unknown) => void) {
            return addSubscription(
                `/topic/diary/${diaryId}/documentId/${documentId}/yjs`,
                cb
            );
        },

        disconnect() {
            subscriptions.forEach(s => { try { s.unsubscribe(); } catch { /* ignore */ } });
            subscriptions.length = 0;
            chatCallbacks.clear();
            client.deactivate();
        },
    };
}
