import { FastifyInstance } from 'fastify';
import { authenticateGuard } from '../../plugins/authenticate.js';
import { ChatService } from './chat.service.js';
import { 
  getUserRoomsHandler, 
  getRoomMessagesHandler, 
  createDirectMessageHandler, 
  createGroupRoomHandler, 
  sendMessageHandler
} from './chat.handlers.js';

const chatService = new ChatService();

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateGuard);

  fastify.get('/rooms', getUserRoomsHandler);
  fastify.get('/rooms/:roomId/messages', getRoomMessagesHandler);
  fastify.post('/rooms/:roomId/messages', sendMessageHandler);
  fastify.post('/rooms/dm', createDirectMessageHandler);
  fastify.post('/rooms/group', createGroupRoomHandler);
}