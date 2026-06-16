import { db } from '../../config/db.js';
import { usersTable } from './users.schema.js';
import { eq, and, or, ilike, SQL, ne } from 'drizzle-orm';



export class UsersService {

  /**
   * Fetches all registered users for communication directories (Chat/Mentions)
   * Accessible by all logged-in accounts. Omits sensitive fields and the requester.
   */
  async getAllUsers(excludeUserId?: string) {
    const conditions: SQL[] = [];

    if (excludeUserId) {
      conditions.push(ne(usersTable.id, excludeUserId));
    }

    return await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }
  
  /**
   * Fetches user accounts with search and role matching matrices
   */
  async getAccounts(filters: { search?: string; role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER' }) {
    const conditions: SQL[] = [];

    // Filter by case-insensitive name or email search match
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(usersTable.name, pattern),
          ilike(usersTable.email, pattern)
        )!
      );
    }

    // Filter exactly by privileges status core rank
    if (filters.role) {
      conditions.push(eq(usersTable.role, filters.role));
    }

    return await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt
      })
      .from(usersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }
}