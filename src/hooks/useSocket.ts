"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | undefined;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const resolveSocketUrl = () => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }

    if (typeof window !== "undefined") {
        const { protocol, hostname, port } = window.location;

        if (LOCAL_HOSTS.has(hostname)) {
            const targetPort = process.env.NEXT_PUBLIC_SOCKET_PORT || "3001";
            return `${protocol}//${hostname}:${targetPort}`;
        }

        const inferredPort =
            process.env.NEXT_PUBLIC_SOCKET_PORT ||
            port ||
            (protocol === "https:" ? "443" : "80");

        return `${protocol}//${hostname}${inferredPort ? `:${inferredPort}` : ""}`;
    }

    return "http://localhost:3001";
};

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [transport, setTransport] = useState("N/A");
    const [error, setError] = useState<string | null>(null);

    const socketUrl = useMemo(() => resolveSocketUrl(), []);

    useEffect(() => {
        if (!socket) {
            console.log("Initializing socket...", socketUrl);
            socket = io(socketUrl, {
                transports: ["websocket", "polling"],
                reconnectionAttempts: 5,
            });
        }

        const activeSocket = socket;

        const onConnect = () => {
            if (!activeSocket) return;
            console.log("Socket connected!", activeSocket.id);
            setIsConnected(true);
            setTransport(activeSocket.io.engine.transport.name);
            setError(null);
        };

        const onDisconnect = (reason: string) => {
            console.log("Socket disconnected:", reason);
            setIsConnected(false);
        };

        const onConnectError = (err: Error) => {
            console.error("Socket connection error:", err);
            const errorMsg = err.message || "websocket error";
            if (errorMsg.includes("websocket") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("Failed to fetch")) {
                setError("Unable to connect to sync server. Please check if the server is running.");
            } else {
                setError(errorMsg);
            }
        };

        if (activeSocket.connected) {
            onConnect();
        }

        activeSocket.on("connect", onConnect);
        activeSocket.on("disconnect", onDisconnect);
        activeSocket.on("connect_error", onConnectError);

        activeSocket.io.engine.on("upgrade", (newTransport) => {
            setTransport(newTransport.name);
        });

        return () => {
            activeSocket.off("connect", onConnect);
            activeSocket.off("disconnect", onDisconnect);
            activeSocket.off("connect_error", onConnectError);
        };
    }, [socketUrl]);

    return { socket, isConnected, transport, error };
};
