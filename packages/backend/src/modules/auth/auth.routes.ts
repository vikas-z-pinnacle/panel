import { FastifyInstance } from 'fastify';
import { loginHandler, signupHandler, refreshSessionHandler, logoutHandler } from './auth.handlers.js';
import { fastifyLoginSchema, fastifySignupSchema } from './auth.schemas.js';
import { authenticateGuard } from '../../plugins/authenticate.js';

export async function authRoutes(fastify: FastifyInstance) {

  // Define strict brute-force throttling: Max 5 attempts per minute per IP
  const authThrottleConfig = {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute'
    }
  };
  
  fastify.post('/login', { schema: fastifyLoginSchema, config: authThrottleConfig }, loginHandler);
  fastify.post('/signup', { schema: fastifySignupSchema, config: authThrottleConfig }, signupHandler);
  fastify.post('/refresh', refreshSessionHandler); // Publicly reachable, self-validating
  
  // Protected route
  fastify.post('/logout', { preHandler: [authenticateGuard] }, logoutHandler);
}