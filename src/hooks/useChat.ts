"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type ChatMessage = {
    id: string;
    sender: string;
    text?: string;
    audio?: string;
    timestamp: number;
};

export function useChat(roomId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!roomId) return;

        // Load existing messages
        fetch(`/api/chat?roomId=${roomId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.messages) {
                    setMessages(data.messages);
                }
            })
            .catch(console.error);

        // Connect to chat SSE endpoint
        const eventSource = new EventSource(`/api/chat/events?roomId=${roomId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onerror = () => {
            setIsConnected(false);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "connected") {
                    return;
                }
                setMessages((prev) => [...prev, data as ChatMessage]);
            } catch (err) {
                console.error("Failed to parse chat message:", err);
            }
        };

        return () => {
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [roomId]);

    const sendMessage = useCallback(
        async (message: ChatMessage) => {
            try {
                await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...message, roomId }),
                });
            } catch (err) {
                console.error("Failed to send message:", err);
            }
        },
        [roomId]
    );

    return { messages, isConnected, sendMessage };
}

