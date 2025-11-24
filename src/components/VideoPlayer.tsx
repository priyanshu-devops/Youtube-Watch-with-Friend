"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Play, Pause } from "lucide-react";

interface VideoPlayerProps {
    roomId: string;
    initialVideoId?: string;
}

type VideoSyncPayload = {
    type: "play" | "pause" | "seek" | "url";
    time?: number;
    url?: string;
};

type VideoStateChangePayload = VideoSyncPayload & { roomId: string };

type YouTubePlayer = {
    playVideo: () => void;
    pauseVideo: () => void;
    stopVideo?: () => void;
    loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
    cueVideoById: (options: { videoId: string }) => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
    getCurrentTime: () => number;
    getPlayerState: () => number;
    destroy?: () => void;
};

type YTStateChangeEvent = {
    data: number;
    target: YouTubePlayer;
};

type YTNamespace = {
    Player: new (
        element: HTMLElement | string,
        options: {
            videoId?: string;
            playerVars?: Record<string, unknown>;
            events?: {
                onReady?: (event: { target: YouTubePlayer }) => void;
                onStateChange?: (event: YTStateChangeEvent) => void;
                onError?: (event: { data: number }) => void;
            };
        }
    ) => YouTubePlayer;
    PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
    };
};

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const PLAYER_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
} as const;

const normalizeUrl = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

const extractVideoId = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);
        const host = url.hostname.toLowerCase();

        if (host.includes("youtu.be")) {
            const candidate = url.pathname.split("/").filter(Boolean)[0];
            return candidate && candidate.length === 11 ? candidate : null;
        }

        if (host.includes("youtube.com")) {
            const searchId = url.searchParams.get("v");
            if (searchId) return searchId;

            const pathSegments = url.pathname.split("/").filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment && lastSegment.length === 11) {
                return lastSegment;
            }
        }
    } catch {
        return null;
    }

    return null;
};

const initialUrlFromId = (videoId?: string) => (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");

export default function VideoPlayer({ roomId, initialVideoId }: VideoPlayerProps) {
    const { socket, isConnected, transport, error: socketError } = useSocket();
    const [inputUrl, setInputUrl] = useState(() => initialUrlFromId(initialVideoId));
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(initialVideoId ?? null);
    const [scriptReady, setScriptReady] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const playerRef = useRef<YouTubePlayer | null>(null);
    const playerContainerRef = useRef<HTMLDivElement | null>(null);
    const lastPlayedRef = useRef<number>(0);
    const isSeekingRef = useRef<boolean>(false);
    const isRemoteUpdate = useRef<boolean>(false);
    const pendingSyncRef = useRef<VideoSyncPayload | null>(null);

    const getCurrentTime = () => playerRef.current?.getCurrentTime?.() ?? 0;

    const emitStateChange = useCallback(
        (payload: VideoStateChangePayload) => {
            socket?.emit("video-state-change", payload);
        },
        [socket]
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        let cancelled = false;

        const markReady = () => {
            if (!cancelled) {
                setScriptReady(true);
            }
        };

        if (window.YT && window.YT.Player) {
            const rafId = window.requestAnimationFrame(markReady);
            return () => {
                cancelled = true;
                window.cancelAnimationFrame(rafId);
            };
        }

        window.onYouTubeIframeAPIReady = markReady;

        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${YOUTUBE_IFRAME_API_SRC}"]`);
        if (!existingScript) {
            const script = document.createElement("script");
            script.src = YOUTUBE_IFRAME_API_SRC;
            script.async = true;
            script.onerror = () => setError("Failed to load YouTube API");
            document.body.appendChild(script);
        }

        return () => {
            cancelled = true;
            if (window.onYouTubeIframeAPIReady === markReady) {
                window.onYouTubeIframeAPIReady = undefined;
            }
        };
    }, []);

    const handlePlayerStateChange = useCallback(
        (event: YTStateChangeEvent) => {
            const currentTime = event.target.getCurrentTime?.() ?? 0;

            if (event.data === PLAYER_STATES.PLAYING) {
                if (!isRemoteUpdate.current) {
                    emitStateChange({ roomId, type: "play", time: currentTime });
                }
            } else if (event.data === PLAYER_STATES.PAUSED || event.data === PLAYER_STATES.ENDED) {
                if (!isRemoteUpdate.current) {
                    emitStateChange({ roomId, type: "pause", time: currentTime });
                }
            }
        },
        [emitStateChange, roomId]
    );

    useEffect(() => {
        if (!scriptReady || playerRef.current || !playerContainerRef.current || !window.YT) {
            return;
        }

        const playerConfig: ConstructorParameters<YTNamespace["Player"]>[1] = {
            playerVars: {
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
            },
            events: {
                onReady: () => {
                    setPlayerReady(true);
                    if (currentVideoId) {
                        const playerInstance = playerRef.current;
                        if (playerInstance && typeof playerInstance.cueVideoById === "function") {
                            playerInstance.cueVideoById({ videoId: currentVideoId });
                        }
                    }
                },
                onStateChange: handlePlayerStateChange,
                onError: (evt) => {
                    setError(`YouTube player error: ${evt.data}`);
                },
            },
        };

        if (currentVideoId) {
            playerConfig.videoId = currentVideoId;
        }

        const player = new window.YT.Player(playerContainerRef.current, playerConfig);

        playerRef.current = player;

        return () => {
            player.destroy?.();
            playerRef.current = null;
            setPlayerReady(false);
        };
    }, [scriptReady, currentVideoId, handlePlayerStateChange]);

    useEffect(() => {
        const player = playerRef.current;
        if (!playerReady || !player || !currentVideoId) return;
        if (typeof player.cueVideoById !== "function") return;
        player.cueVideoById({ videoId: currentVideoId });
    }, [playerReady, currentVideoId]);

    const applySyncPayload = useCallback(
        (data: VideoSyncPayload) => {
            const targetTime = data.time ?? 0;
            const player = playerRef.current;
            if (!player) return;

            if (data.type === "play") {
                if (Math.abs(getCurrentTime() - targetTime) > 0.5 && typeof player.seekTo === "function") {
                    player.seekTo(targetTime, true);
                }
                if (typeof player.playVideo === "function") {
                    player.playVideo();
                }
            } else if (data.type === "pause") {
                if (Math.abs(getCurrentTime() - targetTime) > 0.5 && typeof player.seekTo === "function") {
                    player.seekTo(targetTime, true);
                }
                if (typeof player.pauseVideo === "function") {
                    player.pauseVideo();
                }
            } else if (data.type === "seek") {
                if (typeof player.seekTo === "function") {
                    isSeekingRef.current = true;
                    player.seekTo(targetTime, true);
                    setTimeout(() => {
                        isSeekingRef.current = false;
                    }, 1000);
                }
            }
        },
        []
    );

    useEffect(() => {
        if (!socket) return;

        const handler = (data: VideoSyncPayload) => {
            console.log("Received sync:", data);

            if (data.url) {
                setInputUrl(data.url);
                const id = extractVideoId(data.url);
                if (id) {
                    setCurrentVideoId(id);
                } else {
                    setError("Received invalid YouTube URL.");
                }
            }

            if (playerRef.current) {
                isRemoteUpdate.current = true;
                applySyncPayload(data);
                setTimeout(() => {
                    isRemoteUpdate.current = false;
                }, 500);
            } else {
                pendingSyncRef.current = data;
            }
        };

        socket.on("video-state-sync", handler);
        return () => {
            socket.off("video-state-sync", handler);
        };
    }, [socket, applySyncPayload]);

    useEffect(() => {
        if (!playerReady || !pendingSyncRef.current) return;
        const pending = pendingSyncRef.current;
        pendingSyncRef.current = null;
        isRemoteUpdate.current = true;
        applySyncPayload(pending);
        setTimeout(() => {
            isRemoteUpdate.current = false;
        }, 500);
    }, [playerReady, applySyncPayload]);

    useEffect(() => {
        if (!playerReady) return;
        const interval = window.setInterval(() => {
            if (!playerRef.current) return;
            const current = getCurrentTime();
            const last = lastPlayedRef.current;
            if (!isRemoteUpdate.current && !isSeekingRef.current && Math.abs(current - last) > 2) {
                emitStateChange({ roomId, type: "seek", time: current });
            }
            lastPlayedRef.current = current;
        }, 1000);

        return () => window.clearInterval(interval);
    }, [playerReady, emitStateChange, roomId]);

    const handlePlay = () => {
        if (!playerReady) return;
        if (playerRef.current && typeof playerRef.current.playVideo === "function") {
            playerRef.current.playVideo();
        }
    };

    const handlePause = () => {
        if (!playerReady) return;
        if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
            playerRef.current.pauseVideo();
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputUrl(e.target.value);
    };

    const loadVideo = () => {
        const normalizedUrl = normalizeUrl(inputUrl);

        if (!normalizedUrl) {
            setError("Please enter a valid video URL.");
            return;
        }

        const videoId = extractVideoId(normalizedUrl);
        if (!videoId) {
            setError("Only valid YouTube URLs or IDs are supported.");
            return;
        }

        setError(null);
        setCurrentVideoId(videoId);
        if (playerReady && playerRef.current && typeof playerRef.current.loadVideoById === "function") {
            playerRef.current.loadVideoById({ videoId });
        }
        emitStateChange({
            roomId,
            type: "url",
            url: normalizedUrl,
            time: 0,
        });
    };

    return (
        <div className="flex flex-col w-full max-w-4xl mx-auto p-4 gap-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputUrl}
                    onChange={handleUrlChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            loadVideo();
                        }
                    }}
                    placeholder="Paste YouTube URL"
                    className="flex-1 p-2 border rounded bg-gray-800 text-white border-gray-700"
                />
                <button onClick={loadVideo} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Load
                </button>
            </div>

            <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden shadow-xl">
                <div ref={playerContainerRef} className="absolute top-0 left-0 w-full h-full" />
                {!currentVideoId && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-500">
                        Enter a YouTube URL to start watching
                    </div>
                )}
            </div>

            {error && (
                <div className="p-2 bg-red-900/50 text-red-200 rounded text-sm text-center">
                    {error}
                </div>
            )}

            <div className="flex justify-center gap-4">
                <button
                    onClick={handlePlay}
                    disabled={!playerReady}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play size={16} /> Play
                </button>
                <button
                    onClick={handlePause}
                    disabled={!playerReady}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Pause size={16} /> Pause
                </button>
            </div>

            <div className="text-sm text-gray-400 text-center">
                {isConnected
                    ? `Connected to Sync Server (${transport})`
                    : socketError
                        ? `Connection Error: ${socketError}`
                        : "Connecting..."}
            </div>
        </div>
    );
}
