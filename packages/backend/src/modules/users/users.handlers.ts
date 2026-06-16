import { FastifyReply, FastifyRequest } from 'fastify';
import { UsersService } from './users.service.js';

const usersService = new UsersService();

/**
 * Handles querying, searching, and filtering system accounts via the database layer
 * FIX: Pass the interface as a generic type argument <GetAccountsRequest>
 */
export async function getAccountsHandler(
  request: FastifyRequest,  
  reply: FastifyReply
) {
  try {
    const query = request.query as { search?: string; role?: string };
    const { search, role } = query;
    
    const roleFilter = (role && role !== 'ALL') 
      ? (role as 'SUPER_ADMIN' | 'ADMIN' | 'USER') 
      : undefined;

    const accounts = await usersService.getAccounts({
      search: search || undefined,
      role: roleFilter
    });

    return reply.status(200).send({
      message: "Real-time records synced from Drizzle user storage nodes.",
      accounts
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ 
      error: "Failed to fetch filtered user list directory." 
    });
  }
}