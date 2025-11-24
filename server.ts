import { createServer } from "http";
import { parse as parseUrl } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Create server for Next.js
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parseUrl(req.url ?? "/", true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });

    // Create a separate server for Socket.IO to avoid Next.js conflicts
    const socketServer = createServer();
    const socketPort = 3001;

    const io = new Server(socketServer, {
        cors: {
            origin: "*", // Allow all origins for dev
            methods: ["GET", "POST"]
        }
    });

    type RoomState = {
        url: string;
        isPlaying: boolean;
        time: number;
        lastUpdated: number;
    };

    type VideoStateChangeEvent = {
        roomId: string;
        type: "play" | "pause" | "seek" | "url";
        time: number;
        url?: string;
    };

    type ChatMessagePayload = {
        roomId: string;
        message: string;
        sender: string;
        timestamp: number;
    };

    type VoiceMessagePayload = {
        roomId: string;
        audioBlob: ArrayBuffer;
        sender: string;
    };

    const rooms = new Map<string, RoomState>();

    io.on("connection", (socket) => {
        console.log("Client connected", socket.id);

        socket.on("join-room", (roomId: string) => {
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId}`);

            // Send current room state to new joiner
            const roomState = rooms.get(roomId);
            if (roomState) {
                // Calculate estimated current time based on last update
                let currentTime = roomState.time;
                if (roomState.isPlaying) {
                    const timeDiff = (Date.now() - roomState.lastUpdated) / 1000;
                    currentTime += timeDiff;
                }

                socket.emit("video-state-sync", {
                    type: roomState.isPlaying ? "play" : "pause",
                    time: currentTime,
                    url: roomState.url
                });
            }
        });

        socket.on("video-state-change", (data: VideoStateChangeEvent) => {
            // data: { roomId, type: 'play' | 'pause' | 'seek' | 'url', time, rate, url }

            // Update room state
            const currentState = rooms.get(data.roomId) || { url: "", isPlaying: false, time: 0, lastUpdated: Date.now() };

            if (data.type === "play") {
                currentState.isPlaying = true;
                currentState.time = data.time;
                currentState.lastUpdated = Date.now();
            } else if (data.type === "pause") {
                currentState.isPlaying = false;
                currentState.time = data.time;
                currentState.lastUpdated = Date.now();
            } else if (data.type === "seek") {
                currentState.time = data.time;
                currentState.lastUpdated = Date.now();
            } else if (data.type === "url" && data.url) {
                currentState.url = data.url;
                currentState.isPlaying = false;
                currentState.time = 0;
                currentState.lastUpdated = Date.now();
            }

            rooms.set(data.roomId, currentState);

            // Broadcast to everyone else in the room
            socket.to(data.roomId).emit("video-state-sync", data);
        });

        socket.on("chat-message", (data: ChatMessagePayload) => {
            // data: { roomId, message, sender, timestamp }
            io.to(data.roomId).emit("chat-message-sync", data);
        });

        socket.on("voice-message", (data: VoiceMessagePayload) => {
            // data: { roomId, audioBlob, sender }
            // Broadcast to room
            socket.to(data.roomId).emit("voice-message-sync", data);
        });

        socket.on("disconnect", (reason) => {
            console.log("Client disconnected", socket.id, reason);
        });
    });

    socketServer.listen(socketPort, () => {
        console.log(`> Socket.IO server running on port ${socketPort}`);
    });
});
