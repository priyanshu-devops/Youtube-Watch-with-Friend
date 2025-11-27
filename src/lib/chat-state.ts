export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    audio?: string;
    timestamp: number;
}

export const chatMessages = new Map<string, ChatMessage[]>();
export const chatSubscribers = new Map<string, Set<ReadableStreamDefaultController>>();
