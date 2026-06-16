import { LoginSchema } from '@my-app/shared';
import { z } from 'zod';

export const fastifyLoginSchema = {
  body: LoginSchema,
  response: {
    200: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']),
      }),
    }),
  },
};

export const fastifySignupSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']).optional(),
  }),
  response: {
    201: z.object({
      message: z.string(),
      accessToken: z.string(),
      refreshToken: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']),
      }),
    }),
  },
};