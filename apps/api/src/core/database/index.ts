import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const isNeonUrl = (url: string) => url.includes('.neon.tech');

export const createDatabaseConnection = (connectionString: string) => {
  if (isNeonUrl(connectionString)) {
    const sql = neon(connectionString);
    return drizzleNeon(sql, { schema });
  }
  const pool = new Pool({ connectionString });
  return drizzleNodePg(pool, { schema });
};

export type Database = ReturnType<typeof createDatabaseConnection>;
export { schema };
