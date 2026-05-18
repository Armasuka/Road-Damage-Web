import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL as string;
if (dbUrl && dbUrl.startsWith('DATABASE_URL=')) {
  dbUrl = dbUrl.replace('DATABASE_URL=', '').replace(/^["']|["']$/g, '');
}

if (dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    // If password is not properly encoded and they submitted like user:[@Armasuka11]@host... wait URL parser might fail directly!
    // Since URL parser fails if `@` is in the password, let's fix it manually before new URL()
    // It looks like: postgresql://user:pass@host:port/dbname
    const match = dbUrl.match(/^(postgresql:\/\/[^:]+:)(.*)(@[^@]+:\d+\/.*)$/);
    if (match) {
      const part1 = match[1];
      let password = match[2];
      if (password.startsWith('[') && password.endsWith(']')) password = password.slice(1, -1);
      const part3 = match[3];
      dbUrl = part1 + encodeURIComponent(password) + part3;
    }
  } catch(e) {}
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql', // 'postgresql' | 'mysql' | 'sqlite'
  dbCredentials: {
    url: dbUrl,
  },
  schemaFilter: ['public'],
});
