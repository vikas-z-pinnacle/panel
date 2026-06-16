import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Fastify preHandler hook to enforce JWT authentication.
 * If validation fails, it stops execution immediately and throws a 401.
 */
export async function authenticateGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Looks for 'Authorization: Bearer <Token>' header and verifies it
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid or missing token' });
  }
}