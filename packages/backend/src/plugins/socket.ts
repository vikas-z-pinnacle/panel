import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Server as SocketServer, Socket } from 'socket.io';
import jsonwebtoken from 'jsonwebtoken';
import { ChatService } from '../modules/chat/chat.service.js';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

interface JWTPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

const MAX_MESSAGE_LENGTH = 4000;

const chatService = new ChatService();

// Maps userId -> set of connected socket.io socket IDs for that user.
// Used so the REST send handler can broadcast 'new_message' to everyone
// in a room EXCEPT the sender's own socket(s) — the sender already gets
// the persisted message back as the direct HTTP response, so echoing it
// back over the socket too would (and did) cause duplicate messages to
// render client-side.
export const userSocketRegistry = new Map<string, Set<string>>();

function registerUserSocket(userId: string, socketId: string) {
  const existing = userSocketRegistry.get(userId);
  if (existing) {
    existing.add(socketId);
  } else {
    userSocketRegistry.set(userId, new Set([socketId]));
  }
}

function unregisterUserSocket(userId: string, socketId: string) {
  const existing = userSocketRegistry.get(userId);
  if (!existing) return;
  existing.delete(socketId);
  if (existing.size === 0) {
    userSocketRegistry.delete(userId);
  }
}

// Generic ack callback shape clients can optionally pass as the last arg
// to send_message / join_room so they get a definitive success/failure
// signal instead of relying on a fire-and-forget emit.
type Ack = (response: { ok: boolean; error?: string; data?: any }) => void;

function isAck(fn: unknown): fn is Ack {
  return typeof fn === 'function';
}

async function socketPlugin(fastify: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL;
  let adapter: ReturnType<typeof createAdapter> | undefined = undefined;

  if (redisUrl) {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    
    await Promise.all([pubClient.connect(), subClient.connect()]);
    fastify.log.info('[Socket.IO] Redis adapter connected successfully.');
    adapter = createAdapter(pubClient, subClient);
  }

  fastify.addHook('onReady', function (done) {
    // FRONTEND must be explicitly set — falling back to a permissive/undefined
    // origin here would either break CORS or silently allow any origin
    // depending on the Socket.IO/Engine.IO version. Fail loudly instead.
    const allowedOrigin = process.env.FRONTEND;
    if (!allowedOrigin) {
      fastify.log.warn(
        '[Socket.IO] FRONTEND env var is not set — refusing all cross-origin socket connections by default.'
      );
    }

    const io = new SocketServer(fastify.server, {
      adapter,
      cors: {
        origin: allowedOrigin || false, // `false` disables cross-origin access rather than silently allowing it
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    fastify.decorate('io', io);

    // Share access token validation directly with your existing JWT secret
    io.use((socket: Socket, next) => {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new Error('Unauthorized: Missing token header'));
      }

      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        fastify.log.error('[Socket.IO] JWT_SECRET is not configured.');
        return next(new Error('Server misconfiguration'));
      }

      try {
        const decoded = jsonwebtoken.verify(token, jwtSecret) as JWTPayload;
        socket.data.user = decoded;
        next();
      } catch {
        return next(new Error('Unauthorized: Token verification failed'));
      }
    });

    io.on('connection', (socket: Socket) => {
      const user = socket.data.user as JWTPayload;
      fastify.log.info(`[WS Connected]: ${user.email}`);

      registerUserSocket(user.id, socket.id);

      // Track which rooms this socket has been authorized into, so
      // send_message can't be used to post into a room the socket
      // never actually (successfully) joined.
      const authorizedRooms = new Set<string>();

      socket.on('join_room', async ({ roomId }: { roomId: string }, ack?: Ack) => {
        try {
          if (!roomId || typeof roomId !== 'string') {
            if (isAck(ack)) ack({ ok: false, error: 'Invalid roomId.' });
            return;
          }

          // AUTHORIZATION CHECK: only allow joining rooms the user is
          // actually a participant of. Without this, any authenticated
          // user could join any room and read its live message stream.
          const isParticipant = await chatService.isUserInRoom(user.id, roomId);
          if (!isParticipant) {
            fastify.log.warn(
              `[WS] User ${user.email} attempted to join unauthorized room ${roomId}`
            );
            if (isAck(ack)) ack({ ok: false, error: 'You are not a participant in this room.' });
            return;
          }

          socket.join(roomId);
          authorizedRooms.add(roomId);
          if (isAck(ack)) ack({ ok: true });
        } catch (err) {
          fastify.log.error(err, 'Failed to join room');
          if (isAck(ack)) ack({ ok: false, error: 'Failed to join room.' });
        }
      });

      socket.on('leave_room', ({ roomId }: { roomId: string }) => {
        if (!roomId || typeof roomId !== 'string') return;
        socket.leave(roomId);
        authorizedRooms.delete(roomId);
      });

      // NOTE: Message creation is intentionally NOT duplicated here.
      // The REST endpoint (POST /chat/rooms/:roomId/messages -> sendMessageHandler)
      // is the single source of truth for writing messages; it persists
      // the message and then emits 'new_message' over this same io instance.
      // Keeping a second, parallel "send_message" socket event that also
      // calls chatService.createMessage() would let a socket bypass the
      // REST layer's authorization check and create a second, divergent
      // code path for the same write. If you need a pure-socket send path
      // in the future, route it through chatService with the same
      // isUserInRoom guard used below, rather than re-adding it directly.
      socket.on(
        'send_message',
        async (_payload: { roomId: string; content: string }, ack?: Ack) => {
          if (isAck(ack)) {
            ack({
              ok: false,
              error: 'Sending messages over the socket is disabled. Use POST /chat/rooms/:roomId/messages.',
            });
          }
        }
      );

      socket.on('disconnect', (reason) => {
        unregisterUserSocket(user.id, socket.id);
        fastify.log.info(`[WS Disconnected]: ${user.email} (${reason})`);
      });

      socket.on('error', (err) => {
        fastify.log.error(err, `[WS Error]: ${user.email}`);
      });
    });

    done();
  });
}

export default fp(socketPlugin);