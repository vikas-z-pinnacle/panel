import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '../hooks/useChatStore.js';
import { useAuthStore } from '../../auth/hooks/useAuthStore.js';
import { api } from '../../../config/api.js';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function ChatViewport() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, joinRoom, leaveRoom } = useChatStore();
  const { user: currentUser } = useAuthStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Fetch conversation history when moving between rooms
  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    api.get(`/chat/rooms/${roomId}/messages`)
      .then((res) => setMessages(res.data.messages))
      .catch((err) => console.error('Failed to fetch historical messages:', err))
      .finally(() => setLoading(false));

    joinRoom(roomId);

    return () => {
      leaveRoom(roomId);
    };
  }, [roomId, joinRoom, leaveRoom]);

  // 2. LISTEN FOR REAL-TIME BROADCASTS FROM THE WEBSOCKET ENGINE CLUSTER
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (incomingMessage: Message) => {
      // Guard: Ensure incoming message belongs to the room the user is actively viewing
      if (incomingMessage.roomId === roomId) {
        setMessages((prev) => {
          // Prevent duplicates (e.g. if HTTP REST response and WS broker cross over)
          if (prev.some((msg) => msg.id === incomingMessage.id)) return prev;
          return [...prev, incomingMessage];
        });
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, roomId]);

  // 3. Dispatch messages via the authoritative REST interface path
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !roomId) return;

    const currentText = text.trim();
    setText(''); // Optimistic input clearing for a faster UI feel

    try {
      const res = await api.post(`/chat/rooms/${roomId}/messages`, { content: currentText });
      const createdMessage = res.data.message;

      // Manually append the message since the socket.ts backend excludes the sender to avoid duplicates
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === createdMessage.id)) return prev;
        return [...prev, createdMessage];
      });
    } catch (err) {
      console.error('Failed to dispatch message context payload:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Scrollable Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Syncing distributed node entries...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs font-medium">
            No secure communications recorded in this context yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs transition-all ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* Meta Details Bar */}
                  <div className="flex items-center justify-between gap-6 mb-0.5">
                    <span className={`text-[11px] font-bold tracking-tight truncate ${isOwnMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                      {isOwnMessage ? 'You' : msg.senderName}
                    </span>
                    <span className={`text-[10px] font-medium tracking-wider select-none ${isOwnMessage ? 'text-blue-200' : 'text-slate-400'}`}>
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