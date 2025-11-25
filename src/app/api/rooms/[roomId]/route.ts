import { NextRequest, NextResponse } from "next/server";
import { rooms, roomSubscribers } from "@/lib/room-state";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params;
    const roomState = rooms.get(roomId);

    if (!roomState) {
        return NextResponse.json({
            url: "",
            isPlaying: false,
            time: 0,
        });
    }

    // Calculate current time if playing
    let currentTime = roomState.time;
    if (roomState.isPlaying) {
        const timeDiff = (Date.now() - roomState.lastUpdated) / 1000;
        currentTime += timeDiff;
    }

    return NextResponse.json({
        url: roomState.url,
        isPlaying: roomState.isPlaying,
        time: currentTime,
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params;
    const body = await request.json();
    const { type, time, url } = body;

    const currentState = rooms.get(roomId) || {
        url: "",
        isPlaying: false,
        time: 0,
        lastUpdated: Date.now(),
    };

    if (type === "play") {
        currentState.isPlaying = true;
        currentState.time = time ?? currentState.time;
        currentState.lastUpdated = Date.now();
    } else if (type === "pause") {
        currentState.isPlaying = false;
        currentState.time = time ?? currentState.time;
        currentState.lastUpdated = Date.now();
    } else if (type === "seek") {
        currentState.time = time ?? currentState.time;
        currentState.lastUpdated = Date.now();
    } else if (type === "url" && url) {
        currentState.url = url;
        currentState.isPlaying = false;
        currentState.time = 0;
        currentState.lastUpdated = Date.now();
    }

    rooms.set(roomId, currentState);

    // Broadcast to all subscribers
    const subscribers = roomSubscribers.get(roomId);
    if (subscribers) {
        const message = JSON.stringify({
            type,
            time: currentState.time,
            url: currentState.url,
        });

        subscribers.forEach((controller) => {
            try {
                controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
            } catch {
                // Client disconnected, remove from subscribers
                subscribers.delete(controller);
            }
        });
    }

    return NextResponse.json({ success: true });
}

