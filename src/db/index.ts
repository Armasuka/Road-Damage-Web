import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

let connectionString = process.env.DATABASE_URL || '';

// Sanitize connectionString if user accidentally put DATABASE_URL="url" in the env value
if (connectionString.startsWith('DATABASE_URL=')) {
  connectionString = connectionString.replace('DATABASE_URL=', '').replace(/^["']|["']$/g, '');
}

if (connectionString) {
  try {
    const match = connectionString.match(/^(postgresql:\/\/[^:]+:)(.*)(@[^@]+:\d+\/.*)$/);
    if (match) {
      let pwd = match[2];
      if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1);
      connectionString = match[1] + encodeURIComponent(pwd) + match[3];
    }
  } catch(e) {}
}

// In preview without env vars, this might fail, so we wrap it
let dbClient: ReturnType<typeof drizzle> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

try {
  if (connectionString) {
    sqlClient = postgres(connectionString, { max: 10 });
    dbClient = drizzle(sqlClient, { schema });
  }
} catch (e) {
  console.log("Failed to initialize database, check DATABASE_URL");
}

export const db = dbClient;
export const sql = sqlClient;

