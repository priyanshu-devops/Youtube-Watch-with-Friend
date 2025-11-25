import { NextRequest } from "next/server";
import { roomSubscribers, rooms } from "@/lib/room-state";

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

            // Send current room state immediately if it exists
            const roomState = rooms.get(roomId);
            if (roomState && roomState.url) {
                // Calculate current time if playing
                let currentTime = roomState.time;
                if (roomState.isPlaying) {
                    const timeDiff = (Date.now() - roomState.lastUpdated) / 1000;
                    currentTime += timeDiff;
                }

                // Send URL first
                controller.enqueue(
                    new TextEncoder().encode(
                        `data: ${JSON.stringify({
                            type: "url",
                            url: roomState.url,
                            time: 0,
                        })}\n\n`
                    )
                );

                // Then send play/pause state with current time
                setTimeout(() => {
                    try {
                        controller.enqueue(
                            new TextEncoder().encode(
                                `data: ${JSON.stringify({
                                    type: roomState.isPlaying ? "play" : "pause",
                                    time: currentTime,
                                })}\n\n`
                            )
                        );
                    } catch {
                        // Client may have disconnected
                    }
                }, 500);
            }

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


