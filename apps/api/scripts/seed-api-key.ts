import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDatabaseConnection } from '../src/core/database';
import { organizations, organizationSettings } from '../src/core/database/schema';
import { encrypt } from '../src/common/utils/crypto.util';

async function main() {
  const apiKey = process.env.BLUEFOLDER_API_KEY;
  if (!apiKey) {
    console.error('Usage: BLUEFOLDER_API_KEY=<key> bun run db:seed-api-key [clerk_org_id]');
    process.exit(1);
  }

  const db = createDatabaseConnection(process.env.DATABASE_URL!);

  // Resolve org: use CLI arg, env var, or auto-detect if there's only one
  const clerkOrgId = process.argv[2] || process.env.CLERK_ORG_ID;
  let orgId: string;

  if (clerkOrgId) {
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.clerkId, clerkOrgId))
      .limit(1);

    if (!org) {
      console.error(`Organization not found for Clerk ID: ${clerkOrgId}`);
      process.exit(1);
    }
    orgId = org.id;
    console.log(`Using org: ${org.name} (${clerkOrgId})`);
  } else {
    const orgs = await db
      .select({ id: organizations.id, name: organizations.name, clerkId: organizations.clerkId })
      .from(organizations);

    if (orgs.length === 0) {
      console.error('No organizations found. Sync one from Clerk first.');
      process.exit(1);
    }
    if (orgs.length > 1) {
      console.error('Multiple organizations found. Specify one:');
      for (const org of orgs) {
        console.error(`  ${org.clerkId}  ${org.name}`);
      }
      console.error('\nUsage: BLUEFOLDER_API_KEY=<key> bun run db:seed-api-key <clerk_org_id>');
      process.exit(1);
    }
    orgId = orgs[0].id;
    console.log(`Auto-detected org: ${orgs[0].name} (${orgs[0].clerkId})`);
  }

  const encryptedKey = encrypt(apiKey);
  const hint = apiKey.slice(-4);
  const now = new Date();

  const [existing] = await db
    .select({ id: organizationSettings.id })
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, orgId))
    .limit(1);

  if (existing) {
    await db
      .update(organizationSettings)
      .set({ bluefolderApiKey: encryptedKey, bluefolderApiKeyHint: hint, updatedAt: now })
      .where(eq(organizationSettings.organizationId, orgId));
    console.log(`Updated API key. Hint: ****${hint}`);
  } else {
    await db.insert(organizationSettings).values({
      organizationId: orgId,
      bluefolderApiKey: encryptedKey,
      bluefolderApiKeyHint: hint,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Inserted API key. Hint: ****${hint}`);
  }

  process.exit(0);
}

main();
