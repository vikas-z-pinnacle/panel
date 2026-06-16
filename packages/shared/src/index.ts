import { z } from 'zod';

// Login Validation Schema (used by Fastify for runtime validation and React for form safety)
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Infer TypeScript types from the schema
export type LoginInput = z.infer<typeof LoginSchema>;

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}