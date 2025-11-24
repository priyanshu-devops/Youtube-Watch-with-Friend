"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [transport, setTransport] = useState("N/A");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) {
            console.log("Initializing socket...");
            socket = io("http://localhost:3001", {
                transports: ["websocket", "polling"], // Try websocket first
                reconnectionAttempts: 5,
            });
        }

        const onConnect = () => {
            console.log("Socket connected!", socket.id);
            setIsConnected(true);
            setTransport(socket.io.engine.transport.name);
            setError(null);
        };

        const onDisconnect = (reason: string) => {
            console.log("Socket disconnected:", reason);
            setIsConnected(false);
        };

        const onConnectError = (err: Error) => {
            console.error("Socket connection error:", err);
            setError(err.message);
        };

        if (socket.connected) {
            onConnect();
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);

        socket.io.engine.on("upgrade", (transport) => {
            setTransport(transport.name);
        });

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
        };
    }, []);

    return { socket, isConnected, transport, error };
};
