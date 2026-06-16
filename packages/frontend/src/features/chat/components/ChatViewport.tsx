import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '../hooks/useChatStore.js';
import { useAuthStore } from '../../auth/hooks/useAuthStore.js';
import { api } from '../../../config/api.js';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function ChatViewport() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket } = useChatStore();
  const { user: currentUser } = useAuthStore(); // Grab active session user to check identity
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest messages securely
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history on thread change
  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    api.get(`/chat/rooms/${roomId}/messages`)
      .then(res => setMessages(res.data.messages || []))
      .catch(() => console.error('Failed to load conversation history.'))
      .finally(() => setLoading(false));

    if (socket) {
      socket.emit('join_room', { roomId: roomId });
    }

    return () => {
      if (socket) {
        socket.emit('leave_room', { roomId: roomId });
      }
    };
  }, [roomId, socket]);

  // Listen for real-time messages via open socket connection.
  // Deduplicates by ID to handle cases where the server echoes back
  // a message the sender already appended optimistically.
  useEffect(() => {
    if (!socket) return;

    const handleNewIncomingMessage = (message: Message) => {
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === message.id);
        if (alreadyExists) return prev;
        return [...prev, message];
      });
    };

    socket.on('new_message', handleNewIncomingMessage);

    return () => {
      socket.off('new_message', handleNewIncomingMessage);
    };
  }, [socket]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !roomId || !currentUser) return;

    const content = text.trim();
    setText('');

    // Optimistically append the message immediately so the sender
    // sees their own message without waiting for a socket round-trip.
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name ?? 'You',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.post(`/chat/rooms/${roomId}/messages`, { content });
      const savedMessage: Message = res.data.message;

      // Replace the optimistic placeholder with the real persisted message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? savedMessage : m))
      );
    } catch (err) {
      console.error('Could not transmit payload upstream.');
      // Roll back the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setText(content); // Restore input so the user can retry
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Active Header Sticky Bar */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center bg-white shadow-xs">
        <span className="font-bold text-slate-800 text-sm">Channel Context: {roomId}</span>
      </div>

      {/* Message Streaming Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No historical log records found. Type a message below to begin chatting!
          </div>
        ) : (
          messages.map((msg) => {
            // Identity Comparison Guard Check
            const isOwnMessage = msg.senderId === currentUser?.id;

            return (
              <div 
                key={msg.id} 
                className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-md p-3.5 rounded-2xl shadow-2xs border transition-all relative group
                    ${isOwnMessage 
                      ? 'bg-blue-500 border-blue-700 text-white rounded-tr-none' // Right Side (You)
                      : 'bg-white border-slate-200 text-slate-800 rounded-tl-none' // Left Side (Others)
                    }`}
                >
                  {/* Sender Identifier Meta Tag */}
                  <div className="flex items-baseline justify-between gap-6">
                    <span className={`text-[11px] font-bold tracking-wide truncate ${isOwnMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                      {isOwnMessage ? 'You' : msg.senderName}
                    </span>
                    <span className={`text-[9px] select-none uppercase tracking-wider ${isOwnMessage ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Context Content Body */}
                  <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Action Send Post Form Footer */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your operational text updates..."
          className="flex-1 bg-slate-100 border border-slate-200 text-sm px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}