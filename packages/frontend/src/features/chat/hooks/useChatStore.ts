import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'auth_error';

interface ChatStore {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  activeRoomIds: Set<string>; // Track requested rooms explicitly
  initializeSocket: (token: string) => void;
  disconnectSocket: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  socket: null,
  isConnected: false,
  connectionStatus: 'idle',
  activeRoomIds: new Set(),

  initializeSocket: (token) => {
    if (get().socket?.connected) return;

    // Fix: Cleanly separate the API endpoint from the WebSocket base connection domain
    const rawUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const wsUrl = rawUrl.replace(/\/api$/, ''); 

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ isConnected: true, connectionStatus: 'connected' });
      
      // AUTO-RESYNC: When connecting or reconnecting, join all active rooms
      const { activeRoomIds } = get();
      activeRoomIds.forEach((roomId) => {
        socket.emit('join_room', { roomId }, (res: any) => {
          if (!res?.ok) console.error(`Failed to join room ${roomId} on connect:`, res?.error);
        });
      });
    });

    socket.on('disconnect', (reason) => {
      set({ isConnected: false, connectionStatus: reason === 'io client disconnect' ? 'idle' : 'disconnected' });
    });

    socket.on('connect_error', (err) => {
      const isAuthError = /unauthorized/i.test(err.message);
      set({
        isConnected: false,
        connectionStatus: isAuthError ? 'auth_error' : 'reconnecting',
      });

      if (isAuthError) {
        socket.disconnect();
      }
    });

    set({ socket, connectionStatus: 'connecting' });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, connectionStatus: 'idle', activeRoomIds: new Set() });
    }
  },

  joinRoom: (roomId) => {
    const { socket, activeRoomIds } = get();
    const next = new Set(activeRoomIds);
    next.add(roomId);
    set({ activeRoomIds: next });

    // Emit immediately if the socket is already connected; otherwise, the 'connect' listener will handle it
    if (socket?.connected) {
      socket.emit('join_room', { roomId }, (res: { ok: boolean; error?: string }) => {
        if (!res?.ok) console.error(`Failed to join room ${roomId}:`, res?.error);
      });
    }
  },

  leaveRoom: (roomId) => {
    const { socket, activeRoomIds } = get();
    const next = new Set(activeRoomIds);
    next.delete(roomId);
    set({ activeRoomIds: next });

    if (socket?.connected) {
      socket.emit('leave_room', { roomId });
    }
  },
}));