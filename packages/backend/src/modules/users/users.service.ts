import { db } from '../../config/db.js';
import { usersTable } from './users.schema.js';
import { eq, and, or, ilike, SQL } from 'drizzle-orm';

export class UsersService {
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