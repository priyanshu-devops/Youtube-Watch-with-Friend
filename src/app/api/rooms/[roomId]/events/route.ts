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

            // Send current room state immediately if it exists (after a small delay to ensure client is ready)
            const sendInitialState = () => {
                const roomState = rooms.get(roomId);
                if (roomState && roomState.url) {
                    try {
                        // Calculate current time if playing
                        let currentTime = roomState.time;
                        if (roomState.isPlaying) {
                            const timeDiff = (Date.now() - roomState.lastUpdated) / 1000;
                            currentTime += timeDiff;
                        }

                        // Send URL with initial time
                        controller.enqueue(
                            new TextEncoder().encode(
                                `data: ${JSON.stringify({
                                    type: "url",
                                    url: roomState.url,
                                    time: currentTime,
                                })}\n\n`
                            )
                        );

                        // Send play/pause state
                        controller.enqueue(
                            new TextEncoder().encode(
                                `data: ${JSON.stringify({
                                    type: roomState.isPlaying ? "play" : "pause",
                                    time: currentTime,
                                })}\n\n`
                            )
                        );
                    } catch (error) {
                        console.error("Error sending initial state:", error);
                    }
                }
            };

            // Send initial state after a brief delay
            setTimeout(sendInitialState, 100);

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


