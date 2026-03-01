import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, desc, sql, isNotNull, and, isNull } from 'drizzle-orm';
import type { ServiceRequestStats } from '@fieldrunner/shared';
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

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_SIZE = 50;

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);
  private readonly findAllCache = new Map<string, CacheEntry<(typeof serviceRequests.$inferSelect)[]>>();

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
      assigneeName: sr.serviceManagerName || sr.accountManagerName || null,
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
          assigneeName: sql`excluded.assignee_name`,
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

    this.findAllCache.delete(clerkOrgId);

    this.logger.log('Synced service requests', {
      clerkOrgId,
      total: items.length,
    });

    return { total: items.length, syncedAt };
  }

  async findAll(clerkOrgId: string) {
    const cached = this.findAllCache.get(clerkOrgId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    const rows = await this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, organizationId))
      .orderBy(desc(serviceRequests.bluefolderId));

    this.evictExpiredCacheEntries();
    if (this.findAllCache.size >= MAX_CACHE_SIZE) {
      // Map preserves insertion order — delete the oldest entry
      const oldestKey = this.findAllCache.keys().next().value!;
      this.findAllCache.delete(oldestKey);
    }

    this.findAllCache.set(clerkOrgId, {
      data: rows,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return rows;
  }

  private evictExpiredCacheEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.findAllCache) {
      if (entry.expiresAt <= now) {
        this.findAllCache.delete(key);
      }
    }
  }

  async getStats(clerkOrgId: string): Promise<ServiceRequestStats> {
    const rows = await this.findAll(clerkOrgId);

    const stats: ServiceRequestStats = {
      newCount: 0,
      inProgress: 0,
      assigned: 0,
      open: 0,
    };

    for (const row of rows) {
      const status = row.status?.toLowerCase();
      if (status === 'new') stats.newCount++;
      else if (status === 'in progress') stats.inProgress++;
      else if (status === 'assigned') stats.assigned++;
      if (row.isOpen) stats.open++;
    }

    return stats;
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
