import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing!');
}

// Disable pre-allocation of connections for serverless environments or quick restarts
const queryClient = postgres(process.env.DATABASE_URL);

export const db = drizzle(queryClient);