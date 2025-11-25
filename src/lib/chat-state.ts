// Shared state management for chat
// In production, use Vercel KV or Upstash Redis instead of in-memory storage

export type ChatMessage = {
    id: string;
    sender: string;
    text?: string;
    audio?: string;
    timestamp: number;
};

export const chatMessages = new Map<string, ChatMessage[]>();
export const chatSubscribers = new Map<string, Set<ReadableStreamDefaultController>>();

