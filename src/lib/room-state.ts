// Shared state management for rooms
// In production, use Vercel KV or Upstash Redis instead of in-memory storage

export type RoomState = {
    url: string;
    isPlaying: boolean;
    time: number;
    lastUpdated: number;
};

export const rooms = new Map<string, RoomState>();
export const roomSubscribers = new Map<string, Set<ReadableStreamDefaultController>>();

