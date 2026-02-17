#!/usr/bin/env bun
/**
 * Database reset utility for local development.
 *
 * Usage:
 *   bun run db:reset                         # Truncate ALL tables
 *   bun run db:reset --clerk-id user_xxx     # Remove a specific user and all references
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../src/database/schema';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://localhost:5432/fieldrunner';

if (DATABASE_URL.includes('.neon.tech')) {
  console.error('ERROR: This script is for local development only.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function truncateAll() {
  console.log('Truncating all tables...\n');

  // Order matters: truncate children before parents to avoid FK issues,
  // or just CASCADE. Using CASCADE for simplicity.
  await db.execute(sql`
    TRUNCATE TABLE
      role_permissions,
      organization_memberships,
      organization_invitations,
      organization_domains,
      webhook_events,
      users,
      organizations,
      roles,
      permissions
    CASCADE
  `);

  console.log('All tables truncated.');
}

async function removeUser(clerkId: string) {
  console.log(`Removing user ${clerkId} and all references...\n`);

  // Look up internal UUID
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.clerkId, clerkId));

  if (!user) {
    console.error(`User with clerk_id "${clerkId}" not found.`);
    process.exit(1);
  }

  const userId = user.id;

  // Delete in FK order: children first
  const memberships = await db
    .delete(schema.organizationMemberships)
    .where(eq(schema.organizationMemberships.userId, userId))
    .returning({ id: schema.organizationMemberships.id });
  console.log(`  Deleted ${memberships.length} membership(s)`);

  const invitations = await db
    .delete(schema.organizationInvitations)
    .where(eq(schema.organizationInvitations.userId, userId))
    .returning({ id: schema.organizationInvitations.id });
  console.log(`  Deleted ${invitations.length} invitation(s)`);

  const webhookEvents = await db
    .delete(schema.webhookEvents)
    .where(
      sql`${schema.webhookEvents.payload}->>'id' = ${clerkId}
          OR ${schema.webhookEvents.payload}->'public_user_data'->>'user_id' = ${clerkId}`,
    )
    .returning({ id: schema.webhookEvents.id });
  console.log(`  Deleted ${webhookEvents.length} webhook event(s)`);

  await db.delete(schema.users).where(eq(schema.users.id, userId));
  console.log(`  Deleted user ${clerkId}`);

  console.log('\nDone.');
}

// --- CLI ---

async function main() {
  const args = process.argv.slice(2);
  const clerkIdIndex = args.indexOf('--clerk-id');

  try {
    if (clerkIdIndex !== -1) {
      const clerkId = args[clerkIdIndex + 1];
      if (!clerkId) {
        console.error('Usage: bun run db:reset --clerk-id <clerk_id>');
        process.exit(1);
      }
      await removeUser(clerkId);
    } else {
      await truncateAll();
    }
  } finally {
    await pool.end();
  }
}

main();
