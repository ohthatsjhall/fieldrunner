import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDatabaseConnection } from '../src/core/database';
import { organizations, organizationSettings } from '../src/core/database/schema';
import { encrypt } from '../src/common/utils/crypto.util';

const CLERK_ORG_ID = 'org_3A8gYqFuZtFCpFY4iFOsclK1mhs';

async function main() {
  const apiKey = process.env.BLUEFOLDER_API_KEY;
  if (!apiKey) {
    console.error('Missing BLUEFOLDER_API_KEY env var');
    process.exit(1);
  }

  const db = createDatabaseConnection(process.env.DATABASE_URL!);
  const encryptedKey = encrypt(apiKey);
  const hint = apiKey.slice(-4);
  const now = new Date();

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkId, CLERK_ORG_ID))
    .limit(1);

  if (!org) {
    console.error(`Org not found for Clerk ID: ${CLERK_ORG_ID}`);
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: organizationSettings.id })
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, org.id))
    .limit(1);

  if (existing) {
    await db
      .update(organizationSettings)
      .set({ bluefolderApiKey: encryptedKey, bluefolderApiKeyHint: hint, updatedAt: now })
      .where(eq(organizationSettings.organizationId, org.id));
  } else {
    await db.insert(organizationSettings).values({
      organizationId: org.id,
      bluefolderApiKey: encryptedKey,
      bluefolderApiKeyHint: hint,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`Done. Hint: ****${hint}`);
  process.exit(0);
}

main();
