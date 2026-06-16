import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../config/db.js';
import { refreshTokensTable, usersTable } from '../users/users.schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { LoginInput } from '@my-app/shared';
import { AuthService } from './auth.service.js';

const authService = new AuthService();

export async function loginHandler(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
  try {
    const user = await authService.validateUser(request.body);
    
    const accessToken = request.server.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } 
    );

    const refreshToken = request.server.jwt.sign(
      { id: user.id },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
    await authService.saveRefreshToken(user.id, refreshToken);
    return { 
      accessToken, 
      refreshToken, 
      user 
    };
  } catch (error) {
    return reply.status(401).send({ error: (error as Error).message });
  }
}

export async function signupHandler(
  request: FastifyRequest<{ Body: { name: string; email: string; password: string, role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER' } }>,
  reply: FastifyReply
) {
  try {
    const { name, email, password, role } = request.body;
    
    const user = await authService.registerUser({
      name,
      email,
      plainPassword: password,
      role
    });

    const accessToken = request.server.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } 
    );

    const refreshToken = request.server.jwt.sign(
      { id: user.id },
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    await authService.saveRefreshToken(user.id, refreshToken);

    return reply.status(201).send({
      message: "User registered successfully",
      accessToken, 
      refreshToken,
      user,
    });
  } catch (error) {
    return reply.status(400).send({ error: (error as Error).message });
  }
}

export async function refreshSessionHandler(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
) {
  const { refreshToken } = request.body;

  try {
    // 1. Check if the token exists in DB and is not expired
    const [storedToken] = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.token, refreshToken),
          gt(refreshTokensTable.expiresAt, new Date()) // Must be greater than current timestamp
        )
      )
      .limit(1);

    if (!storedToken) {
      return reply.status(401).send({ error: "Invalid or expired refresh token" });
    }

    // 2. Fetch the corresponding user
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, storedToken.userId))
      .limit(1);

    // 3. Issue a new 15-minute access token
    const newAccessToken = request.server.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    return { 
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  } catch (error) {
    return reply.status(401).send({ error: "Session refreshment failed" });
  }
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = request.user as { id: string };
    
    await authService.revokeUserRefreshTokens(user.id);

    return reply.status(200).send({ 
      success: true, 
      message: "Logged out successfully." 
    });
  } catch (error) {
    return reply.status(500).send({ 
      error: "Failed to invalidate session." 
    });
  }
}