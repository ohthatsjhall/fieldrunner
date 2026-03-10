/**
 * One-time script: Backfill vendor assignments from BlueFolder "Vendor Information" custom fields.
 *
 * Usage:
 *   bun run scripts/backfill-vendor-assignments.ts <clerkOrgId>
 *
 * Example:
 *   bun run scripts/backfill-vendor-assignments.ts org_2abc123
 *
 * Requires DATABASE_URL and ENCRYPTION_KEY env vars (loads from .env automatically).
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VendorBackfillService } from '../src/integrations/vendor-sourcing/vendor-backfill.service';

async function main() {
  const clerkOrgId = process.argv[2];
  if (!clerkOrgId) {
    console.error('Usage: bun run scripts/backfill-vendor-assignments.ts <clerkOrgId>');
    process.exit(1);
  }

  console.log(`Starting vendor assignment backfill for org: ${clerkOrgId}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const backfillService = app.get(VendorBackfillService);
  const result = await backfillService.backfill(clerkOrgId);

  console.log('\nBackfill complete:');
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Matched:   ${result.matched}`);
  console.log(`  Unmatched: ${result.unmatched}`);
  console.log(`  Skipped:   ${result.skipped}`);

  await app.close();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
