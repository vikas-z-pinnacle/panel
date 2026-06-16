import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Server as SocketServer, Socket } from 'socket.io';
import jsonwebtoken from 'jsonwebtoken';
import { ChatService } from '../modules/chat/chat.service.js';

interface JWTPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

const chatService = new ChatService();

async function socketPlugin(fastify: FastifyInstance) {
  fastify.addHook('onReady', function (done) {
    const io = new SocketServer(fastify.server, {
      cors: {
        origin: 'http://localhost:5173', // Matches your Vite client port
        methods: ['GET', 'POST'],
      },
    });

    // Share access token validation directly with your existing JWT secret
    io.use((socket: Socket, next) => {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new Error('Unauthorized: Missing token header'));
      }

      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

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

      socket.on('join_room', ({ roomId }: { roomId: string }) => {
        socket.join(roomId);
      });

      socket.on('leave_room', ({ roomId }: { roomId: string }) => {
        socket.leave(roomId);
      });

      socket.on('send_message', async ({ roomId, content }: { roomId: string; content: string }) => {
        if (!content.trim()) return;
        try {
          const savedMsg = await chatService.createMessage(roomId, user.id, content);
          io.to(roomId).emit('new_message', {
            id: savedMsg.id,
            senderName: savedMsg.senderName,
            content: savedMsg.content,
            createdAt: savedMsg.createdAt,
          });
        } catch (err) {
          fastify.log.error(err, 'Failed to process WebSocket event package');
        }
      });

      socket.on('disconnect', () => {
        fastify.log.info(`[WS Disconnected]: ${user.email}`);
      });
    });

    done();
  });
}

export default fp(socketPlugin);