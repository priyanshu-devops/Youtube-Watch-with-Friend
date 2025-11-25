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
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastMessageIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!roomId) return;

        setIsConnected(true);

        // Polling function to check for new messages
        const pollMessages = async () => {
            try {
                const response = await fetch(`/api/chat?roomId=${roomId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch messages");
                }

                const data = await response.json();
                if (data.messages && Array.isArray(data.messages)) {
                    setMessages(data.messages);

                    // Track the last message ID to know if there are new messages
                    if (data.messages.length > 0) {
                        lastMessageIdRef.current = data.messages[data.messages.length - 1].id;
                    }
                }
            } catch (err) {
                console.error("Failed to fetch messages:", err);
                setIsConnected(false);
            }
        };

        // Initial load
        pollMessages();

        // Poll every 2 seconds for new messages
        pollingIntervalRef.current = setInterval(pollMessages, 2000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [roomId]);

    const sendMessage = useCallback(
        async (message: ChatMessage) => {
            try {
                // Optimistically add message to UI
                setMessages((prev) => [...prev, message]);

                await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...message, roomId }),
                });
            } catch (err) {
                console.error("Failed to send message:", err);
                // Remove optimistically added message on error
                setMessages((prev) => prev.filter((m) => m.id !== message.id));
            }
        },
        [roomId]
    );

    return { messages, isConnected, sendMessage };
}


