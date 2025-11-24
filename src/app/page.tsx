"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, PlayCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    router.push(`/room/${newRoomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex flex-col gap-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
          WatchParty
        </h1>
        <p className="text-xl text-gray-400">
          Watch YouTube videos in perfect sync with friends.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 mt-8">
          <button
            onClick={createRoom}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 bg-red-900/20 border-red-900"
          >
            <h2 className={`mb-3 text-2xl font-semibold flex items-center gap-2`}>
              Create Room <PlayCircle />
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Start a new watch party and invite your friends.
            </p>
          </button>

          <form onSubmit={joinRoom} className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 bg-blue-900/20 border-blue-900">
            <h2 className={`mb-3 text-2xl font-semibold flex items-center gap-2`}>
              Join Room <Users />
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="p-2 rounded bg-black border border-gray-700 text-white"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                Go
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
