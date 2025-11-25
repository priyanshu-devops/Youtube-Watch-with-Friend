import { NextRequest } from "next/server";
import { roomSubscribers } from "@/lib/room-state";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params;

    const stream = new ReadableStream({
        start(controller) {
            // Add this connection to subscribers
            if (!roomSubscribers.has(roomId)) {
                roomSubscribers.set(roomId, new Set());
            }
            roomSubscribers.get(roomId)!.add(controller);

            // Send initial connection message
            controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
            );

            // Cleanup on close
            request.signal.addEventListener("abort", () => {
                const roomSubs = roomSubscribers.get(roomId);
                if (roomSubs) {
                    roomSubs.delete(controller);
                    if (roomSubs.size === 0) {
                        roomSubscribers.delete(roomId);
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


