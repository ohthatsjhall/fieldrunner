import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and, inArray } from 'drizzle-orm';
import { SYNC_COMPLETED } from '../../common/events/sync.events';
import type { SyncCompletedEvent } from '../../common/events/sync.events';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import {
  serviceRequests,
  vendorSearchSessions,
} from '../../core/database/schema';
import { VendorSourcingService } from './vendor-sourcing.service';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../core/database/schema';

@Injectable()
export class VendorAutoSearchListener {
  private readonly logger = new Logger(VendorAutoSearchListener.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly vendorSourcingService: VendorSourcingService,
  ) {}

  @OnEvent(SYNC_COMPLETED, { async: true })
  async handleSyncCompleted(payload: SyncCompletedEvent) {
    const { clerkOrgId, organizationId } = payload;

    try {
      // Find SRs with status 'Assigned' in this org
      const assignedSrs = await this.db
        .select({ id: serviceRequests.id, bluefolderId: serviceRequests.bluefolderId })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.organizationId, organizationId),
            eq(serviceRequests.status, 'Assigned'),
          ),
        );

      if (assignedSrs.length === 0) return;

      // Find which SRs already have a vendor search session
      const srIds = assignedSrs.map((sr) => sr.id);
      const existingSessions = await this.db
        .select({ serviceRequestId: vendorSearchSessions.serviceRequestId })
        .from(vendorSearchSessions)
        .where(inArray(vendorSearchSessions.serviceRequestId, srIds));

      const searched = new Set(existingSessions.map((s) => s.serviceRequestId));
      const needsSearch = assignedSrs.filter((sr) => !searched.has(sr.id));

      if (needsSearch.length === 0) {
        this.logger.debug('All assigned SRs already have vendor searches');
        return;
      }

      this.logger.log(
        `Auto-searching vendors for ${needsSearch.length} assigned SR(s)`,
      );

      for (let i = 0; i < needsSearch.length; i++) {
        const sr = needsSearch[i];
        try {
          await this.vendorSourcingService.search(clerkOrgId, {
            serviceRequestBluefolderId: sr.bluefolderId,
            initiatedBy: 'auto',
          });
          this.logger.log(
            `Auto-search completed for SR ${sr.bluefolderId}`,
          );
        } catch (err) {
          this.logger.error(
            `Auto-search failed for SR ${sr.bluefolderId}`,
            err instanceof Error ? err.stack : String(err),
          );
        }

        // Rate limit: 5s delay between searches to avoid overwhelming external APIs (Google Places, Nominatim, BuildZoom)
        if (i < needsSearch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    } catch (err) {
      this.logger.error(
        'Auto vendor search handler failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
