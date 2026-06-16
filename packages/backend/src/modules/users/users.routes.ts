import { FastifyInstance } from 'fastify';
import { authenticateGuard } from '../../plugins/authenticate.js';
import { authorizeGuard } from '../../plugins/authorize.js';
import { getAccountsHandler } from './users.handlers.js';

interface GetAccountsRequest {
  Querystring: {
    search?: string;
    role?: string;
  };
}

export async function protectedUserRoutes(fastify: FastifyInstance) {
  // Step 1: Universal Authenticate Hook (User must be logged in to reach any route here)
  fastify.addHook('preHandler', authenticateGuard);

  fastify.get<GetAccountsRequest>(
    '/accounts', 
    { preHandler: [authorizeGuard(['ADMIN', 'SUPER_ADMIN'])] }, 
    getAccountsHandler
  );

}