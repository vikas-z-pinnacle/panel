import { db } from '../../config/db.js';
import { chatRoomsTable, chatRoomParticipantsTable, chatMessagesTable } from './chat.schema.js';
import { usersTable } from '../users/users.schema.js';
import { eq, desc, and, inArray } from 'drizzle-orm';

export class ChatService {
  /**
   * Creates a generic chat room (useful for group channels)
   */
  async createGroupRoom(name: string, participantUserIds: string[]) {
    return await db.transaction(async (tx) => {
      const [newRoom] = await tx
        .insert(chatRoomsTable)
        .values({ name })
        .returning();

      const participantsData = participantUserIds.map((userId) => ({
        roomId: newRoom.id,
        userId: userId,
      }));

      if (participantsData.length > 0) {
        await tx.insert(chatRoomParticipantsTable).values(participantsData);
      }

      return newRoom;
    });
  }

  /**
   * Creates a Direct Message room securely after verifying the target user exists.
   * Ensures the room actually contains both specific users.
   */
  async getOrCreateDirectMessage(currentUserId: string, targetUserId: string, targetUserName: string) {
    return await db.transaction(async (tx) => {
      // 1. CRITICAL GUARDRAIL: Verify the target user actually exists in the database
      const [targetUserExists] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, targetUserId));

      if (!targetUserExists) {
        throw new Error('TARGET_USER_NOT_FOUND');
      }

      // 2. Fetch all rooms that both users belong to
      const user1Rooms = await tx
        .select({ roomId: chatRoomParticipantsTable.roomId })
        .from(chatRoomParticipantsTable)
        .where(eq(chatRoomParticipantsTable.userId, currentUserId));

      const user2Rooms = await tx
        .select({ roomId: chatRoomParticipantsTable.roomId })
        .from(chatRoomParticipantsTable)
        .where(eq(chatRoomParticipantsTable.userId, targetUserId));

      // Extract array of room IDs for each user
      const r1Ids = user1Rooms.map((r) => r.roomId);
      const r2Ids = user2Rooms.map((r) => r.roomId);

      // Find overlapping room IDs where BOTH users are members
      const sharedRoomIds = r1Ids.filter((id) => r2Ids.includes(id));

      // 3. Look for a true 1-on-1 private room among the shared rooms
      if (sharedRoomIds.length > 0) {
        // Query participant counts for these shared rooms to avoid picking group chats they both belong to
        for (const roomId of sharedRoomIds) {
          const participants = await tx
            .select()
            .from(chatRoomParticipantsTable)
            .where(eq(chatRoomParticipantsTable.roomId, roomId));

          // A pure DM room must have exactly 2 members total
          if (participants.length === 2) {
            const [existingRoom] = await tx
              .select()
              .from(chatRoomsTable)
              .where(eq(chatRoomsTable.id, roomId));
            
            return existingRoom;
          }
        }
      }

      // 4. No pre-existing true DM room found; build a new communications link safely
      const [newRoom] = await tx
        .insert(chatRoomsTable)
        .values({ name: `DM: ${targetUserName}` })
        .returning();

      await tx.insert(chatRoomParticipantsTable).values([
        { roomId: newRoom.id, userId: currentUserId },
        { roomId: newRoom.id, userId: targetUserId },
      ]);

      return newRoom;
    });
  }

  async getUserRooms(userId: string) {
    return await db
      .select({
        id: chatRoomsTable.id,
        roomName: chatRoomsTable.name,
      })
      .from(chatRoomsTable)
      .innerJoin(chatRoomParticipantsTable, eq(chatRoomParticipantsTable.roomId, chatRoomsTable.id))
      .where(eq(chatRoomParticipantsTable.userId, userId));
  }

  async getRoomMessages(roomId: string) {
    return await db
      .select({
        id: chatMessagesTable.id,
        content: chatMessagesTable.content,
        createdAt: chatMessagesTable.createdAt,
        senderId: chatMessagesTable.senderId,
        senderName: usersTable.name,
      })
      .from(chatMessagesTable)
      .innerJoin(usersTable, eq(usersTable.id, chatMessagesTable.senderId))
      .where(eq(chatMessagesTable.roomId, roomId))
      .orderBy(desc(chatMessagesTable.createdAt));
  }

  async createMessage(roomId: string, senderId: string, content: string) {
    const [newMessage] = await db
      .insert(chatMessagesTable)
      .values({ roomId, senderId, content })
      .returning();

    const [sender] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, senderId));

    return {
      ...newMessage,
      senderName: sender?.name || 'System User',
    };
  }
}