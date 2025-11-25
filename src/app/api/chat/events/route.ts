import { NextRequest } from "next/server";
import { chatSubscribers } from "@/lib/chat-state";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
        return new Response("roomId required", { status: 400 });
    }

    const stream = new ReadableStream({
        start(controller) {
            if (!chatSubscribers.has(roomId)) {
                chatSubscribers.set(roomId, new Set());
            }
            chatSubscribers.get(roomId)!.add(controller);

            controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
            );

            request.signal.addEventListener("abort", () => {
                const roomSubs = chatSubscribers.get(roomId);
                if (roomSubs) {
                    roomSubs.delete(controller);
                    if (roomSubs.size === 0) {
                        chatSubscribers.delete(roomId);
                    }
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}


