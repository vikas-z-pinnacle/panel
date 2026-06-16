import { LoginInput, UserResponse } from '@my-app/shared';
import { db } from '../../config/db.js';
import { usersTable } from '../users/users.schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { refreshTokensTable } from '../users/users.schema.js';

const SALT_ROUNDS = 10;

// Define the role type to match your schema
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export class AuthService {
  
  async validateUser(data: LoginInput): Promise<UserResponse> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (user) {
      const isPasswordMatch = await bcrypt.compare(data.password, user.passwordHash);
      
      if (isPasswordMatch) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole, // Type assertion
        };
      }
    }

    throw new Error("Invalid credentials");
  }

  async registerUser(data: { 
    name: string; 
    email: string; 
    plainPassword: string; 
    role?: UserRole
  }): Promise<UserResponse> {
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .limit(1);

    if (existingUser) {
      throw new Error("Email is already registered");
    }

    const hashedPassword = await bcrypt.hash(data.plainPassword, SALT_ROUNDS);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role || 'USER', // This will now be type-checked
      })
      .returning();

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as UserRole,
    };
  }

  async saveRefreshToken(userId: string, token: string, daysValid = 7) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    await db.insert(refreshTokensTable).values({
      userId,
      token,
      expiresAt,
    });
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, userId));
  }
}