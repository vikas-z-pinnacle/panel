import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt'; 
import fastifyRateLimit from '@fastify/rate-limit';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import { authRoutes } from './modules/auth/auth.routes.js';
import { protectedUserRoutes } from './modules/users/users.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import socketPlugin from './plugins/socket.js';

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${context.after}.`,
    };
  },
});

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret',
  messages: {
    badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
    noAuthorizationInHeaderMessage: 'Authorized header is missing',
  },
});

await app.register(cors, { origin: 'http://localhost:5173' });

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(protectedUserRoutes, { prefix: '/api/users' });
await app.register(chatRoutes, { prefix: '/api/chat' });

// Register WebSocket engine cleanly inside Fastify lifecycle container
await app.register(socketPlugin);

export default app;