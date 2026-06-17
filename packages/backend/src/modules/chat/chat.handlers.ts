import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatService } from './chat.service.js';
import { Server } from 'socket.io';
import { userSocketRegistry } from '../../plugins/socket.js';

declare module 'fastify' {
  interface FastifyInstance {
    io?: Server;
  }
}

const chatService = new ChatService();
const MAX_MESSAGE_LENGTH = 4000;

export async function getUserRoomsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = request.user as { id: string };
    const rooms = await chatService.getUserRooms(user.id);
    return reply.status(200).send({ rooms });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch conversation channels.' });
  }
}

export async function getRoomMessagesHandler(
  request: FastifyRequest<{ Params: { roomId: string } }>,
  reply: FastifyReply
) {
  try {
    const { roomId } = request.params;
    const historicalMessages = await chatService.getRoomMessages(roomId);
    return reply.status(200).send({ messages: historicalMessages.reverse() });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to retrieve message logs.' });
  }
}

export async function createDirectMessageHandler(
  request: FastifyRequest<{ Body: { targetUserId: string; targetUserName: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string };
    const { targetUserId, targetUserName } = request.body;

    if (!targetUserId || !targetUserName) {
      return reply.status(400).send({ error: 'Missing target user payload criteria.' });
    }

    if (user.id === targetUserId) {
      return reply.status(400).send({ error: 'Invalid Operation: You cannot initiate a private chat loop with yourself.' });
    }

    const room = await chatService.getOrCreateDirectMessage(user.id, targetUserId, targetUserName);
    return reply.status(201).send({ room });
  } catch (error: any) {
    // Gracefully capture custom structural exception
    if (error.message === 'TARGET_USER_NOT_FOUND') {
      return reply.status(404).send({ 
        error: 'Not Found', 
        message: 'The requested target user ID does not exist in the platform system records.' 
      });
    }

    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to build DM communication link.' });
  }
}

export async function createGroupRoomHandler(
  request: FastifyRequest<{ Body: { name: string; userIds: string[] } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string };
    const { name, userIds } = request.body;

    if (!name || !userIds || !Array.isArray(userIds)) {
      return reply.status(400).send({ error: 'Invalid channel criteria parameters.' });
    }

    // Force clean arrays, eliminate duplicates, and strip out creator's own ID if they added it manually
    const targetParticipants = userIds.filter(id => id !== user.id);
    
    if (targetParticipants.length === 0) {
      return reply.status(400).send({ error: 'A group chat must contain at least one other participant.' });
    }

    // Re-inject creator explicitly so they are part of the room membership matrix
    const explicitParticipants = Array.from(new Set([...targetParticipants, user.id]));

    const room = await chatService.createGroupRoom(name, explicitParticipants);
    return reply.status(201).send({ room });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to create group channel structure.' });
  }
}

export async function sendMessageHandler(
  request: FastifyRequest<{ 
    Params: { roomId: string };
    Body: { content: string };
  }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string };
    const { roomId } = request.params;
    const { content } = request.body;

    if (!content || !content.trim()) {
      return reply.status(400).send({ error: 'Message content cannot be empty.' });
    }

    if (content.trim().length > MAX_MESSAGE_LENGTH) {
      return reply.status(400).send({ error: `Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters.` });
    }

    // Verify user is a participant in this room
    const isParticipant = await chatService.isUserInRoom(user.id, roomId);
    if (!isParticipant) {
      return reply.status(403).send({ error: 'You are not a participant in this room.' });
    }

    const message = await chatService.createMessage(roomId, user.id, content.trim());
    
    // Emit via WebSocket if socket plugin is available — but EXCLUDE the
    // sender's own connected socket(s). The sender already gets the
    // authoritative persisted message back in this HTTP response and
    // renders it by replacing their optimistic message; if we also
    // echoed it back over the socket, the sender's client would receive
    // it as a second 'new_message' event and (depending on timing vs.
    // the optimistic-message id swap) render it twice. Other room
    // participants still get the real-time push as normal.
    if (request.server.io) {
      const senderSocketIds = Array.from(userSocketRegistry.get(user.id) ?? []);
      request.server.io.to(roomId).except(senderSocketIds).emit('new_message', message);
    }

    return reply.status(201).send({ message });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to send message.' });
  }
}