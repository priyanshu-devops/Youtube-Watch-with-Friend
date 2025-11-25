"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type VideoSyncPayload = {
    type: "play" | "pause" | "seek" | "url";
    time?: number;
    url?: string;
};

type RoomState = {
    url: string;
    isPlaying: boolean;
    time: number;
    lastUpdated: number;
};

export function useRoomSync(roomId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const syncCallbackRef = useRef<((data: VideoSyncPayload) => void) | null>(null);
    const lastStateRef = useRef<RoomState | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstLoadRef = useRef(true);
    const lastEmittedStateRef = useRef<{ type: string; time: number } | null>(null);
    const ignoreNextStateChangeRef = useRef(false);

    const emitStateChange = useCallback(
        async (payload: VideoSyncPayload) => {
            try {
                // Track what we're sending so we don't apply it back to ourselves
                lastEmittedStateRef.current = {
                    type: payload.type,
                    time: payload.time ?? 0,
                };
                ignoreNextStateChangeRef.current = true;

                await fetch(`/api/rooms/${roomId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                // Reset ignore flag after a short delay
                setTimeout(() => {
                    ignoreNextStateChangeRef.current = false;
                }, 1500);
            } catch (err) {
                console.error("Failed to emit state change:", err);
                setError("Failed to sync");
                ignoreNextStateChangeRef.current = false;
            }
        },
        [roomId]
    );

    useEffect(() => {
        if (!roomId) return;

        setIsConnected(true);
        setError(null);

        // Polling function to check room state
        const pollRoomState = async () => {
            try {
                const response = await fetch(`/api/rooms/${roomId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch room state");
                }

                const roomState: RoomState = await response.json();

                // On first load, always send the current state if it exists
                if (isFirstLoadRef.current && roomState.url) {
                    isFirstLoadRef.current = false;

                    if (syncCallbackRef.current) {
                        // Send URL first
                        syncCallbackRef.current({
                            type: "url",
                            url: roomState.url,
                            time: roomState.time,
                        });

                        // Then send play/pause state
                        setTimeout(() => {
                            if (syncCallbackRef.current) {
                                syncCallbackRef.current({
                                    type: roomState.isPlaying ? "play" : "pause",
                                    time: roomState.time,
                                });
                            }
                        }, 300);
                    }

                    lastStateRef.current = roomState;
                    return;
                }

                // If we just emitted a change, skip processing this poll to avoid self-loop
                if (ignoreNextStateChangeRef.current) {
                    lastStateRef.current = roomState;
                    return;
                }

                // Compare with last known state to detect changes
                if (lastStateRef.current && syncCallbackRef.current) {
                    const lastState = lastStateRef.current;

                    // Check if this state change is from our own action
                    const isOurOwnChange = lastEmittedStateRef.current &&
                        Math.abs(roomState.lastUpdated - Date.now()) < 2000;

                    // URL changed
                    if (roomState.url !== lastState.url) {
                        syncCallbackRef.current({
                            type: "url",
                            url: roomState.url,
                            time: roomState.time,
                        });
                    }

                    // Play state changed (only if not our own change)
                    if (roomState.isPlaying !== lastState.isPlaying) {
                        if (!isOurOwnChange ||
                            (lastEmittedStateRef.current &&
                                lastEmittedStateRef.current.type !== (roomState.isPlaying ? "play" : "pause"))) {
                            syncCallbackRef.current({
                                type: roomState.isPlaying ? "play" : "pause",
                                time: roomState.time,
                            });
                        }
                    }

                    // Time jumped (seek) - only if not our own seek
                    const timeDiff = Math.abs(roomState.time - lastState.time);
                    const expectedDiff = roomState.isPlaying ?
                        (roomState.lastUpdated - lastState.lastUpdated) / 1000 : 0;

                    if (timeDiff > 2 && Math.abs(timeDiff - expectedDiff) > 1) {
                        if (!isOurOwnChange ||
                            (lastEmittedStateRef.current && lastEmittedStateRef.current.type !== "seek")) {
                            syncCallbackRef.current({
                                type: "seek",
                                time: roomState.time,
                            });
                        }
                    }
                }

                lastStateRef.current = roomState;
                setError(null);
            } catch (err) {
                console.error("Polling error:", err);
                setError("Connection error");
                setIsConnected(false);
            }
        };

        // Initial poll
        pollRoomState();

        // Poll every 1 second
        pollingIntervalRef.current = setInterval(pollRoomState, 1000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [roomId]);

    const onSync = useCallback((callback: (data: VideoSyncPayload) => void) => {
        syncCallbackRef.current = callback;
    }, []);

    return { isConnected, error, emitStateChange, onSync };
}

