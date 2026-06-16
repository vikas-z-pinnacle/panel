import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Fastify hook factory to enforce Role-Based Access Control.
 * @param allowedRoles Array of strings matching 'SUPER_ADMIN' | 'ADMIN' | 'USER'
 */
export function authorizeGuard(allowedRoles: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Ensure the user object was already attached by our prior authenticateGuard
    const user = request.user as { id: string; email: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' } | undefined;

    if (!user || !user.role) {
      return reply.status(401).send({ error: 'Unauthorized: No token profile identity located.' });
    }

    // 2. Verify if the user's role has permission to access this endpoint
    const hasPermission = allowedRoles.includes(user.role);

    if (!hasPermission) {
      return reply.status(403).send({ 
        error: 'Forbidden', 
        message: 'Access Denied: You do not have the required permissions to access this resources.' 
      });
    }
  };
}