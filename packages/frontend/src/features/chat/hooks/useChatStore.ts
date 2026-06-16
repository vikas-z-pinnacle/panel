import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface ChatStore {
  socket: Socket | null;
  isConnected: boolean;
  initializeSocket: (token: string) => void;
  disconnectSocket: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  socket: null,
  isConnected: false,

  initializeSocket: (token) => {
    if (get().socket?.connected) return;

    // Direct configuration point targeting base server URL engine instance
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    
    const socket = io(wsUrl, {
      auth: { token: `Bearer ${token}` },
      autoConnect: true,
    });

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));