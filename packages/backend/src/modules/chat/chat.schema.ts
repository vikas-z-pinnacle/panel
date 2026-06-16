import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '../users/users.schema.js';

export const chatRoomsTable = pgTable('chat_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatRoomParticipantsTable = pgTable('chat_room_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => chatRoomsTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const chatMessagesTable = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => chatRoomsTable.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});