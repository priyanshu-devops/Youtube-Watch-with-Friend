"use client";

import React, { useEffect, useState, useRef } from "react";
import { useChat, type ChatMessage } from "@/hooks/useChat";
import { Send, Mic, Smile } from "lucide-react";

interface ChatPanelProps {
    roomId: string;
    username: string;
}

export default function ChatPanel({ roomId, username }: ChatPanelProps) {
    const { messages, sendMessage: sendChatMessage } = useChat(roomId);
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim()) return;
        const msg: ChatMessage = {
            id: Date.now().toString(),
            sender: username,
            text: input,
            timestamp: Date.now(),
        };
        sendChatMessage(msg);
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
                    const msg: ChatMessage = {
                        id: Date.now().toString(),
                        sender: username,
                        audio: base64,
                        timestamp: Date.now(),
                    };
                    sendChatMessage(msg);
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
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700 w-full lg:w-96 lg:min-w-[384px] shadow-xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
                <h2 className="text-lg font-semibold text-white">Chat</h2>
                <p className="text-xs text-gray-400 mt-1">Room: {roomId}</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender === username ? "items-end" : "items-start"}`}
                        >
                            <div className="text-xs text-gray-400 mb-1 px-2">
                                {msg.sender === username ? "You" : msg.sender}
                            </div>
                            <div
                                className={`px-4 py-2.5 rounded-2xl max-w-[85%] shadow-md ${
                                    msg.sender === username
                                        ? "bg-blue-600 text-white rounded-br-md"
                                        : "bg-gray-800 text-gray-100 rounded-bl-md"
                                }`}
                            >
                                {msg.text && (
                                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                        {msg.text}
                                    </p>
                                )}
                                {msg.audio && (
                                    <audio
                                        controls
                                        src={msg.audio}
                                        className="w-full h-8 mt-2"
                                        style={{ minWidth: "200px" }}
                                    />
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 px-2">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700 bg-gray-800 relative">
                {showEmoji && (
                    <div className="absolute bottom-full left-4 mb-2 bg-gray-800 p-3 rounded-lg shadow-2xl grid grid-cols-5 gap-2 border border-gray-700 z-10">
                        {["😀", "😂", "😍", "🔥", "👍", "👎", "🎉", "🤔", "👀", "🚀"].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    setInput((prev) => prev + emoji);
                                    setShowEmoji(false);
                                }}
                                className="text-2xl hover:bg-gray-700 p-2 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <button
                        type="button"
                        className="p-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors flex-shrink-0"
                        onClick={() => setShowEmoji(!showEmoji)}
                        title="Add emoji"
                    >
                        <Smile size={20} />
                    </button>
                    <button
                        type="button"
                        className={`p-2.5 rounded-lg flex-shrink-0 transition-colors ${
                            isRecording
                                ? "bg-red-600 animate-pulse text-white"
                                : "bg-gray-700 hover:bg-gray-600 text-white"
                        }`}
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        title="Hold to record voice"
                    >
                        <Mic size={20} />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-colors placeholder-gray-400"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                        title="Send message"
                    >
                        <Send size={20} className="flex-shrink-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}
