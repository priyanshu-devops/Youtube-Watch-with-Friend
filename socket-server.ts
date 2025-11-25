import { createServer } from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 3001;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
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
        io.to(data.roomId).emit("chat-message-sync", data);
    });

    socket.on("voice-message", (data: VoiceMessagePayload) => {
        socket.to(data.roomId).emit("voice-message-sync", data);
    });

    socket.on("disconnect", (reason) => {
        console.log("Client disconnected", socket.id, reason);
    });
});

httpServer.listen(port, () => {
    console.log(`> Socket.IO server running on port ${port}`);
    console.log(`> Allowed origins: ${allowedOrigins.join(", ")}`);
});

