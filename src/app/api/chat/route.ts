import { NextRequest, NextResponse } from "next/server";
import { chatMessages, chatSubscribers } from "@/lib/chat-state";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { roomId, id, sender, text, audio, timestamp } = body;

    if (!chatMessages.has(roomId)) {
        chatMessages.set(roomId, []);
    }

    const message = { id, sender, text, audio, timestamp };
    chatMessages.get(roomId)!.push(message);

    // Broadcast to all subscribers
    const roomSubs = chatSubscribers.get(roomId);
    if (roomSubs) {
        const messageData = JSON.stringify(message);
        roomSubs.forEach((controller) => {
            try {
                controller.enqueue(
                    new TextEncoder().encode(`data: ${messageData}\n\n`)
                );
            } catch {
                roomSubs.delete(controller);
            }
        });
    }

    return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
        return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    const messages = chatMessages.get(roomId) || [];
    return NextResponse.json({ messages });
}

