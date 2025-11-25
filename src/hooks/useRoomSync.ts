"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type VideoSyncPayload = {
    type: "play" | "pause" | "seek" | "url";
    time?: number;
    url?: string;
};

export function useRoomSync(roomId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const syncCallbackRef = useRef<((data: VideoSyncPayload) => void) | null>(null);

    const emitStateChange = useCallback(
        async (payload: VideoSyncPayload) => {
            try {
                await fetch(`/api/rooms/${roomId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } catch (err) {
                console.error("Failed to emit state change:", err);
            }
        },
        [roomId]
    );

    useEffect(() => {
        if (!roomId) return;

        // Connect to SSE endpoint
        const eventSource = new EventSource(`/api/rooms/${roomId}/events`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        eventSource.onerror = (err) => {
            console.error("SSE error:", err);
            setIsConnected(false);
            setError("Connection error");
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as VideoSyncPayload | { type: "connected" };
                if (data.type === "connected") {
                    return;
                }
                if (syncCallbackRef.current) {
                    syncCallbackRef.current(data);
                }
            } catch (err) {
                console.error("Failed to parse SSE message:", err);
            }
        };

        return () => {
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [roomId]);

    const onSync = useCallback((callback: (data: VideoSyncPayload) => void) => {
        syncCallbackRef.current = callback;
    }, []);

    return { isConnected, error, emitStateChange, onSync };
}

