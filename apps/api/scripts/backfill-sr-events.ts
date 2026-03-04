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
import { parseStatusChange } from '../src/integrations/bluefolder/utils/parse-status-change';

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
      const historyEntries = await fetchHistoryWithRetry(
        client,
        apiKey,
        String(sr.bluefolderId),
      );
      if (!historyEntries) {
        processed++;
        await delay(RATE_LIMIT_DELAY_MS);
        continue;
      }

      // Filter to status changes and creation entries
      const statusChanges = historyEntries.filter(
        (e) => e.entryType === 'Status Changed',
      );
      const createdEntry = historyEntries.find(
        (e) => e.entryType === 'Created',
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

      // Chain from_status: infer from previous event's to_status
      // First event defaults to 'New' (initial SR status per lifecycle)
      for (let i = 0; i < events.length; i++) {
        if (events[i].fromStatus == null) {
          events[i].fromStatus = i > 0 ? events[i - 1].toStatus : 'New';
        }
      }

      // Compute durationInStatusMs between consecutive events
      const createdAt = createdEntry
        ? new Date(createdEntry.entryDate)
        : sr.dateTimeCreated;

      const eventRows: (typeof serviceRequestEvents.$inferInsert)[] = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        let durationInStatusMs: number | null = null;

        if (i > 0) {
          durationInStatusMs =
            event.occurredAt.getTime() - events[i - 1].occurredAt.getTime();
        } else if (createdAt) {
          // First status change — duration from creation
          durationInStatusMs =
            event.occurredAt.getTime() - createdAt.getTime();
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
        try {
          await db
            .insert(serviceRequestEvents)
            .values(eventRows)
            .onConflictDoNothing();
          totalEvents += eventRows.length;
        } catch (insertErr: any) {
          console.error(
            `  Failed to insert events for SR ${sr.bluefolderId}: ${insertErr?.message ?? insertErr}`,
          );
        }
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

async function fetchHistoryWithRetry(
  client: BlueFolderClientService,
  apiKey: string,
  bluefolderId: string,
): Promise<BfServiceRequestHistoryEntry[] | null> {
  try {
    const result = await client.request<BfServiceRequestHistoryResponse>(
      'serviceRequests/getHistory.aspx',
      apiKey,
      { serviceRequestId: bluefolderId },
    );
    return result.serviceRequestHistoryList?.serviceRequestHistory ?? [];
  } catch (error: any) {
    if (
      error?.statusCode === 429 ||
      error?.name === 'BlueFolderRateLimitError'
    ) {
      const retryAfter = error.retryAfterSeconds ?? 60;
      console.log(`  Rate limited. Waiting ${retryAfter}s...`);
      await delay(retryAfter * 1000);
      try {
        const result = await client.request<BfServiceRequestHistoryResponse>(
          'serviceRequests/getHistory.aspx',
          apiKey,
          { serviceRequestId: bluefolderId },
        );
        return result.serviceRequestHistoryList?.serviceRequestHistory ?? [];
      } catch (retryErr: any) {
        console.error(
          `  Failed SR ${bluefolderId} after retry: ${retryErr?.message ?? retryErr}`,
        );
        return null;
      }
    }
    console.error(
      `  Failed SR ${bluefolderId}: ${error?.message ?? error}`,
    );
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
