export interface RoomState {
    url: string;
    isPlaying: boolean;
    time: number;
    lastUpdated: number;
}

export const rooms = new Map<string, RoomState>();
export const roomSubscribers = new Map<string, Set<ReadableStreamDefaultController>>();
