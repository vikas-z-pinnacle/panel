import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'auth_error';

interface ChatStore {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  // Rooms the UI currently wants joined (e.g. the active chat thread).
  // Re-applied automatically after every reconnect, since Socket.IO
  // does NOT remember server-side room membership across a reconnect —
  // a fresh underlying connection means the server-side socket.join()
  // calls from before are gone and must be redone.
  activeRoomIds: Set<string>;
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

    // Direct configuration point targeting base server URL engine instance
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

    const socket = io(wsUrl, {
      auth: { token: `Bearer ${token}` },
      autoConnect: true,
      // Reconnection is on by default in socket.io-client, but we set
      // these explicitly so behavior doesn't silently change on a
      // library upgrade, and so we have a bounded backoff.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      set({ isConnected: true, connectionStatus: 'connected' });

      // Re-join any rooms the UI considers "active". A reconnect gives us
      // a brand new transport-level connection; the server's in-memory
      // socket.join() state from before the drop is gone, so without this
      // the client would silently stop receiving new_message events for
      // the room it was just looking at.
      const { activeRoomIds } = get();
      activeRoomIds.forEach((roomId) => {
        socket.emit('join_room', { roomId }, (res: { ok: boolean; error?: string }) => {
          if (!res?.ok) {
            console.error(`Failed to rejoin room ${roomId} after reconnect:`, res?.error);
          }
        });
      });
    });

    socket.on('disconnect', (reason) => {
      // 'io server disconnect' means the server forcibly closed the
      // connection (e.g. auth revoked) and socket.io-client will NOT
      // auto-reconnect in that case unless we tell it to.
      if (reason === 'io server disconnect') {
        set({ isConnected: false, connectionStatus: 'disconnected' });
      } else {
        set({ isConnected: false, connectionStatus: 'reconnecting' });
      }
    });

    socket.on('connect_error', (err) => {
      // Auth failures surface here (e.g. expired/invalid JWT). Distinguish
      // them from generic network errors so the UI can prompt a re-login
      // instead of just showing "reconnecting...".
      const isAuthError = /unauthorized/i.test(err.message);
      set({
        isConnected: false,
        connectionStatus: isAuthError ? 'auth_error' : 'reconnecting',
      });

      if (isAuthError) {
        // Stop endlessly retrying with a token that will never become valid.
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

    if (socket?.connected) {
      socket.emit('join_room', { roomId }, (res: { ok: boolean; error?: string }) => {
        if (!res?.ok) {
          console.error(`Failed to join room ${roomId}:`, res?.error);
        }
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