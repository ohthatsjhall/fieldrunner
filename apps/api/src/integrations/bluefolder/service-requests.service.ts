import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, desc, sql, isNotNull, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import type { Database } from '../../core/database';
import {
  serviceRequests,
  organizations,
  organizationSettings,
} from '../../core/database/schema';
import { BlueFolderService } from './bluefolder.service';
import { BlueFolderUsersService } from './bluefolder-users.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';

export interface SyncResult {
  total: number;
  syncedAt: Date;
}

export interface ServiceRequestStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    private readonly blueFolderService: BlueFolderService,
    private readonly usersService: BlueFolderUsersService,
    private readonly settingsService: OrganizationSettingsService,
  ) {}

  async sync(clerkOrgId: string): Promise<SyncResult> {
    // Sync users first so name resolution is up-to-date for SR enrichment
    try {
      await this.usersService.sync(clerkOrgId);
    } catch (err) {
      this.logger.warn('User sync failed, continuing with SR sync', {
        clerkOrgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);
    const items = await this.blueFolderService.listServiceRequests(clerkOrgId);
    const syncedAt = new Date();

    if (items.length === 0) {
      this.logger.log('No service requests to sync', { clerkOrgId });
      return { total: 0, syncedAt };
    }

    const rows = items.map((sr) => ({
      organizationId,
      bluefolderId: sr.serviceRequestId,
      description: sr.description,
      status: sr.status,
      priority: sr.priority,
      priorityLabel: sr.priorityLabel,
      type: sr.type,
      customerName: sr.customerName,
      customerId: sr.customerId || null,
      isOpen: sr.isOpen,
      isOverdue: sr.isOverdue,
      billableTotal: String(sr.billableTotal),
      costTotal: String(sr.costTotal),
      dateTimeCreated: sr.dateTimeCreated
        ? new Date(sr.dateTimeCreated)
        : null,
      dateTimeClosed: sr.dateTimeClosed
        ? new Date(sr.dateTimeClosed)
        : null,
      syncedAt,
      updatedAt: syncedAt,
    }));

    await this.db
      .insert(serviceRequests)
      .values(rows)
      .onConflictDoUpdate({
        target: [serviceRequests.organizationId, serviceRequests.bluefolderId],
        set: {
          description: sql`excluded.description`,
          status: sql`excluded.status`,
          priority: sql`excluded.priority`,
          priorityLabel: sql`excluded.priority_label`,
          type: sql`excluded.type`,
          customerName: sql`excluded.customer_name`,
          customerId: sql`excluded.customer_id`,
          isOpen: sql`excluded.is_open`,
          isOverdue: sql`excluded.is_overdue`,
          billableTotal: sql`excluded.billable_total`,
          costTotal: sql`excluded.cost_total`,
          dateTimeCreated: sql`excluded.date_time_created`,
          dateTimeClosed: sql`excluded.date_time_closed`,
          syncedAt: sql`excluded.synced_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    this.logger.log('Synced service requests', {
      clerkOrgId,
      total: items.length,
    });

    return { total: items.length, syncedAt };
  }

  async findAll(clerkOrgId: string) {
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    return this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, organizationId))
      .orderBy(desc(serviceRequests.bluefolderId));
  }

  async getStats(clerkOrgId: string): Promise<ServiceRequestStats> {
    const rows = await this.findAll(clerkOrgId);

    return {
      total: rows.length,
      open: rows.filter((r) => r.isOpen).length,
      closed: rows.filter((r) => !r.isOpen).length,
      overdue: rows.filter((r) => r.isOverdue).length,
    };
  }

  async getLastSyncedAt(clerkOrgId: string): Promise<Date | null> {
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    const result = await this.db
      .select({ syncedAt: serviceRequests.syncedAt })
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, organizationId))
      .orderBy(desc(serviceRequests.syncedAt))
      .limit(1);

    return result[0]?.syncedAt ?? null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAll(): Promise<void> {
    const orgs = await this.db
      .select({ clerkId: organizations.clerkId })
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

    if (orgs.length === 0) {
      this.logger.debug('No orgs with BlueFolder API keys — skipping sync');
      return;
    }

    this.logger.log(`Cron sync starting for ${orgs.length} org(s)`);

    for (let i = 0; i < orgs.length; i++) {
      const org = orgs[i];
      try {
        const result = await this.sync(org.clerkId);
        this.logger.log('Cron sync completed', {
          clerkOrgId: org.clerkId,
          total: result.total,
        });
      } catch (err) {
        this.logger.error('Cron sync failed for org', {
          clerkOrgId: org.clerkId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (i < orgs.length - 1) {
        await this.delay(3000);
      }
    }
  }
}
