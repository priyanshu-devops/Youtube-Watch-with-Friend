"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import ChatPanel from "@/components/ChatPanel";
import { useSocket } from "@/hooks/useSocket";

export default function RoomPage() {
    const params = useParams();
    const roomId = params.id as string;
    const { socket } = useSocket();
    const [username, setUsername] = useState("");
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        if (socket && joined) {
            socket.emit("join-room", roomId);
        }
    }, [socket, roomId, joined]);

    if (!joined) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="p-8 bg-gray-900 rounded-lg border border-gray-800">
                    <h2 className="text-2xl font-bold mb-4">Enter your name</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (username.trim()) setJoined(true);
                        }}
                        className="flex gap-2"
                    >
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="p-2 rounded bg-black border border-gray-700 text-white"
                            placeholder="Username"
                            autoFocus
                        />
                        <button type="submit" className="px-4 py-2 bg-red-600 rounded hover:bg-red-700">
                            Join
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <div className="flex-1 flex flex-col">
                <header className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-red-500">WatchParty</h1>
                    <div className="text-sm text-gray-400">Room: {roomId}</div>
                </header>
                <main className="flex-1 p-4 overflow-y-auto flex items-center justify-center">
                    <VideoPlayer roomId={roomId} />
                </main>
            </div>
            <ChatPanel roomId={roomId} username={username} />
        </div>
    );
}
