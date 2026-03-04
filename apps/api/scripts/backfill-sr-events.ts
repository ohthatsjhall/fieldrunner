import 'dotenv/config';
import { eq, isNotNull, isNull, and } from 'drizzle-orm';
import { createDatabaseConnection } from '../src/core/database';
import {
  organizations,
  organizationSettings,
  serviceRequests,
  serviceRequestEvents,
} from '../src/core/database/schema';
import { decrypt } from '../src/common/utils/crypto.util';
import { BlueFolderClientService } from '../src/integrations/bluefolder/bluefolder-client.service';
import type {
  BfServiceRequestHistoryResponse,
  BfServiceRequestHistoryEntry,
} from '../src/integrations/bluefolder/types/bluefolder-api.types';

const RATE_LIMIT_DELAY_MS = 1200; // ~50 req/min, conservative rate limit
const PROGRESS_INTERVAL = 10;

async function main() {
  const db = createDatabaseConnection(process.env.DATABASE_URL!);
  const client = new BlueFolderClientService();

  // Resolve target orgs
  const targetClerkOrgId = process.argv[2];
  let orgRows: { id: string; name: string; clerkId: string; apiKey: string }[];

  const baseQuery = db
    .select({
      id: organizations.id,
      name: organizations.name,
      clerkId: organizations.clerkId,
      apiKey: organizationSettings.bluefolderApiKey,
    })
    .from(organizations)
    .innerJoin(
      organizationSettings,
      eq(organizations.id, organizationSettings.organizationId),
    )
    .where(
      and(
        isNotNull(organizationSettings.bluefolderApiKey),
        isNull(organizations.deletedAt),
      ),
    );

  if (targetClerkOrgId) {
    orgRows = (await baseQuery).filter(
      (r) => r.clerkId === targetClerkOrgId,
    ) as typeof orgRows;
    if (orgRows.length === 0) {
      console.error(`No org found with Clerk ID: ${targetClerkOrgId}`);
      process.exit(1);
    }
  } else {
    orgRows = (await baseQuery) as typeof orgRows;
  }

  if (orgRows.length === 0) {
    console.error('No organizations with BlueFolder API keys found.');
    process.exit(1);
  }

  console.log(`Backfilling events for ${orgRows.length} org(s)...`);

  for (const org of orgRows) {
    console.log(`\nOrg: ${org.name} (${org.clerkId})`);
    const apiKey = decrypt(org.apiKey);

    // Get all SRs for this org
    const srs = await db
      .select({
        id: serviceRequests.id,
        bluefolderId: serviceRequests.bluefolderId,
        dateTimeCreated: serviceRequests.dateTimeCreated,
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, org.id));

    console.log(`  Found ${srs.length} service requests`);

    let processed = 0;
    let totalEvents = 0;

    for (const sr of srs) {
      let historyEntries: BfServiceRequestHistoryEntry[];

      try {
        const result =
          await client.request<BfServiceRequestHistoryResponse>(
            'serviceRequests/getHistory.aspx',
            apiKey,
            { serviceRequestId: String(sr.bluefolderId) },
          );
        historyEntries =
          result.serviceRequestHistoryList?.serviceRequestHistory ?? [];
      } catch (error: any) {
        if (error?.statusCode === 429 || error?.name === 'BlueFolderRateLimitError') {
          const retryAfter = error.retryAfterSeconds ?? 60;
          console.log(`  Rate limited. Waiting ${retryAfter}s...`);
          await delay(retryAfter * 1000);
          // Retry once
          try {
            const result =
              await client.request<BfServiceRequestHistoryResponse>(
                'serviceRequests/getHistory.aspx',
                apiKey,
                { serviceRequestId: String(sr.bluefolderId) },
              );
            historyEntries =
              result.serviceRequestHistoryList?.serviceRequestHistory ?? [];
          } catch {
            console.error(`  Failed SR ${sr.bluefolderId} after retry, skipping`);
            processed++;
            continue;
          }
        } else {
          console.error(
            `  Failed SR ${sr.bluefolderId}: ${error?.message ?? error}`,
          );
          processed++;
          continue;
        }
      }

      // Debug: log first SR's raw entries to understand the data shape
      if (processed === 0) {
        console.log('  [DEBUG] Sample history entries for first SR:');
        for (const e of historyEntries.slice(0, 5)) {
          console.log(`    id="${e.id}" entryType="${e.entryType}" description="${e.description}"`);
        }
        const allTypes = [...new Set(historyEntries.map((e) => e.entryType))];
        console.log(`  [DEBUG] All entryTypes: ${allTypes.join(', ')}`);
      }

      // Filter to status change entries
      const statusChanges = historyEntries.filter(
        (e) => e.entryType === 'Status Changed',
      );

      if (statusChanges.length === 0) {
        processed++;
        if (processed % PROGRESS_INTERVAL === 0) {
          console.log(`  Processed ${processed}/${srs.length} SRs (${totalEvents} events)`);
        }
        await delay(RATE_LIMIT_DELAY_MS);
        continue;
      }

      // Parse and sort chronologically
      const events: {
        fromStatus: string | null;
        toStatus: string;
        occurredAt: Date;
        bluefolderHistoryId: number | null;
      }[] = [];

      for (const entry of statusChanges) {
        const parsed = parseStatusChange(entry.description);
        if (!parsed) continue;

        const historyId = parseInt(entry.id, 10);
        events.push({
          fromStatus: parsed.fromStatus,
          toStatus: parsed.toStatus,
          occurredAt: new Date(entry.entryDate),
          bluefolderHistoryId: Number.isNaN(historyId) ? null : historyId,
        });
      }

      // Sort by occurredAt ascending
      events.sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );

      // Compute durationInStatusMs between consecutive events
      const eventRows: (typeof serviceRequestEvents.$inferInsert)[] = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        let durationInStatusMs: number | null = null;

        if (i > 0) {
          durationInStatusMs =
            event.occurredAt.getTime() - events[i - 1].occurredAt.getTime();
        } else if (sr.dateTimeCreated) {
          // First status change — duration from creation
          durationInStatusMs =
            event.occurredAt.getTime() - sr.dateTimeCreated.getTime();
        }

        eventRows.push({
          organizationId: org.id,
          serviceRequestId: sr.id,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          occurredAt: event.occurredAt,
          durationInStatusMs,
          source: 'bluefolder',
          bluefolderHistoryId: event.bluefolderHistoryId,
        });
      }

      if (eventRows.length > 0) {
        await db
          .insert(serviceRequestEvents)
          .values(eventRows)
          .onConflictDoNothing();
        totalEvents += eventRows.length;
      }

      processed++;
      if (processed % PROGRESS_INTERVAL === 0) {
        console.log(`  Processed ${processed}/${srs.length} SRs (${totalEvents} events)`);
      }

      await delay(RATE_LIMIT_DELAY_MS);
    }

    console.log(
      `  Done: ${processed} SRs processed, ${totalEvents} events inserted`,
    );
  }

  console.log('\nBackfill complete.');
  process.exit(0);
}

function parseStatusChange(
  description: string,
): { fromStatus: string | null; toStatus: string } | null {
  // "Status changed from [X] to [Y]."
  const fullMatch = description.match(
    /Status changed from \[(.+?)\] to \[(.+?)\]/i,
  );
  if (fullMatch) {
    return { fromStatus: fullMatch[1].trim(), toStatus: fullMatch[2].trim() };
  }

  // "Status changed to [Y]."
  const toOnlyMatch = description.match(/Status changed to \[(.+?)\]/i);
  if (toOnlyMatch) {
    return { fromStatus: null, toStatus: toOnlyMatch[1].trim() };
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
