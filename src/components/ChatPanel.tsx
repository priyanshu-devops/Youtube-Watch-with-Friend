"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Send, Mic, Smile } from "lucide-react";

interface ChatPanelProps {
    roomId: string;
    username: string;
}

interface Message {
    id: string;
    sender: string;
    text?: string;
    audio?: string; // base64
    timestamp: number;
}

export default function ChatPanel({ roomId, username }: ChatPanelProps) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on("chat-message-sync", (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });

        socket.on("voice-message-sync", (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            socket.off("chat-message-sync");
            socket.off("voice-message-sync");
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim()) return;
        const msg = {
            id: Date.now().toString(),
            sender: username,
            text: input,
            timestamp: Date.now(),
            roomId
        };
        socket?.emit("chat-message", msg);
        // Removed optimistic update to prevent double messages
        setInput("");
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    const msg = {
                        id: Date.now().toString(),
                        sender: username,
                        audio: base64,
                        timestamp: Date.now(),
                        roomId
                    };
                    socket?.emit("voice-message", msg);
                    // Removed optimistic update to prevent double messages
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-full lg:w-80 lg:min-w-[320px]">
            <div className="p-4 border-b border-gray-800 font-bold text-white">
                Chat
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === username ? "items-end" : "items-start"}`}>
                        <div className="text-xs text-gray-500 mb-1">{msg.sender}</div>
                        <div className={`p-2 rounded-lg max-w-[80%] ${msg.sender === username ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"}`}>
                            {msg.text && <p>{msg.text}</p>}
                            {msg.audio && (
                                <audio controls src={msg.audio} className="w-48 h-8" />
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-800 flex gap-2 items-center relative">
                <button
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => setShowEmoji(!showEmoji)}
                >
                    <Smile size={20} />
                </button>
                {showEmoji && (
                    <div className="absolute bottom-16 left-4 bg-gray-800 p-2 rounded shadow-lg grid grid-cols-5 gap-2 border border-gray-700">
                        {["😀", "😂", "😍", "🔥", "👍", "👎", "🎉", "🤔", "👀", "🚀"].map(emoji => (
                            <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmoji(false); }} className="text-xl hover:bg-gray-700 p-1 rounded">
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
                <button
                    className={`p-2 rounded-full ${isRecording ? "bg-red-600 animate-pulse" : "bg-gray-800 hover:bg-gray-700"} text-white`}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                >
                    <Mic size={20} />
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={sendMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}
