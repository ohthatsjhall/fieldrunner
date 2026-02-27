import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

const isNeonUrl = (url: string) => url.includes('.neon.tech');

export const createDatabaseConnection = (
  connectionString: string,
): Database => {
  if (isNeonUrl(connectionString)) {
    const sql = neon(connectionString);
    return drizzleNeon(sql, { schema }) as unknown as Database;
  }
  const pool = new Pool({ connectionString });
  return drizzleNodePg(pool, { schema });
};
export { schema };
