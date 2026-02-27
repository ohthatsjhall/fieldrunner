import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { eq } from 'drizzle-orm';
import type {
  WebhookEvent,
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  OrganizationDomainJSON,
  OrganizationInvitationJSON,
} from '@clerk/backend';
import { DATABASE_CONNECTION } from '../core/database/database.module';
import type { Database } from '../core/database';
import {
  webhookEvents,
  users,
  organizations,
  organizationMemberships,
  organizationDomains,
  organizationInvitations,
  permissions,
} from '../core/database/schema';
import { mapUserPayload } from './mappers/user.mapper';
import { mapOrganizationPayload } from './mappers/organization.mapper';
import { mapMembershipPayload } from './mappers/membership.mapper';
import { mapPermissionPayload } from './mappers/permission.mapper';
import { mapDomainPayload } from './mappers/domain.mapper';
import { mapInvitationPayload } from './mappers/invitation.mapper';

interface SvixHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

/**
 * Returns a shallow copy of the object with the specified key removed.
 * Used to exclude the conflict-target column from upsert SET clauses.
 */
function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => k !== key),
  ) as Omit<T, K>;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhook: Webhook;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const signingSecret = this.configService.get<string>(
      'CLERK_WEBHOOK_SIGNING_SECRET',
    );

    if (!signingSecret) {
      throw new Error(
        'CLERK_WEBHOOK_SIGNING_SECRET environment variable is not set',
      );
    }

    this.webhook = new Webhook(signingSecret);
  }

  /**
   * Verifies the webhook signature using the svix library.
   * Throws BadRequestException if verification fails.
   */
  verifyWebhook(rawBody: Buffer, headers: SvixHeaders): WebhookEvent {
    try {
      const event = this.webhook.verify(rawBody.toString(), headers);
      return event as WebhookEvent;
    } catch (error) {
      this.logger.warn('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        svixId: headers['svix-id'],
      });
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Logs a webhook event to the database.
   * Returns true if the event was newly inserted, false if it was a duplicate.
   * Detects duplicates via the unique constraint on clerk_event_id.
   */
  async logEvent(
    clerkEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      await this.db.insert(webhookEvents).values({
        clerkEventId,
        eventType,
        payload,
      });

      return true;
    } catch (error) {
      // PostgreSQL unique_violation error code is 23505
      if (this.isUniqueViolation(error)) {
        return this.shouldReprocessEvent(clerkEventId);
      }

      this.logger.error('Failed to log webhook event', {
        clerkEventId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Dispatches a verified webhook event to the appropriate entity handler.
   * Each handler performs an idempotent upsert (create/update) or soft delete.
   */
  async processEvent(event: WebhookEvent): Promise<void> {
    const { type } = event;

    switch (type) {
      case 'user.created':
      case 'user.updated':
      case 'user.deleted':
        await this.handleUserEvent(event);
        break;

      case 'organization.created':
      case 'organization.updated':
      case 'organization.deleted':
        await this.handleOrganizationEvent(event);
        break;

      case 'organizationMembership.created':
      case 'organizationMembership.updated':
      case 'organizationMembership.deleted':
        await this.handleMembershipEvent(event);
        break;

      case 'organizationInvitation.accepted':
      case 'organizationInvitation.created':
      case 'organizationInvitation.revoked':
        await this.handleInvitationEvent(event);
        break;

      case 'organizationDomain.created':
      case 'organizationDomain.updated':
      case 'organizationDomain.deleted':
        await this.handleDomainEvent(event);
        break;

      case 'permission.created':
      case 'permission.updated':
      case 'permission.deleted':
        await this.handlePermissionEvent(event);
        break;

      default:
        this.logger.warn('Unhandled webhook event type', {
          eventType: type,
        });
    }
  }

  /**
   * Marks a webhook event as successfully processed.
   */
  async markProcessed(clerkEventId: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.clerkEventId, clerkEventId));
  }

  /**
   * Marks a webhook event as failed with an error message.
   */
  async markFailed(clerkEventId: string, errorMessage: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({ error: errorMessage })
      .where(eq(webhookEvents.clerkEventId, clerkEventId));
  }

  // ─── Entity Handlers ─────────────────────────────────────────────

  /**
   * Handles user.created, user.updated, and user.deleted events.
   * Created/updated: idempotent upsert via INSERT ON CONFLICT DO UPDATE.
   * Deleted: soft delete by setting deletedAt.
   */
  private async handleUserEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'user.deleted') {
      const clerkId = (event.data as unknown as Record<string, unknown>)
        .id as string;

      this.logger.log('Soft-deleting user', { clerkId });

      await this.db
        .update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.clerkId, clerkId));

      return;
    }

    const data = event.data as unknown as UserJSON;
    const values = mapUserPayload(data);

    this.logger.log('Upserting user', {
      clerkId: values.clerkId,
      eventType: event.type,
    });

    await this.db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.clerkId,
        set: omit(values, 'clerkId'),
      });
  }

  /**
   * Handles organization.created, organization.updated, and organization.deleted events.
   * Created/updated: idempotent upsert via INSERT ON CONFLICT DO UPDATE.
   * Deleted: soft delete by setting deletedAt.
   */
  private async handleOrganizationEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'organization.deleted') {
      const clerkId = (event.data as unknown as Record<string, unknown>)
        .id as string;

      this.logger.log('Soft-deleting organization', { clerkId });

      await this.db
        .update(organizations)
        .set({ deletedAt: new Date() })
        .where(eq(organizations.clerkId, clerkId));

      return;
    }

    const data = event.data as unknown as OrganizationJSON;
    const values = mapOrganizationPayload(data);

    this.logger.log('Upserting organization', {
      clerkId: values.clerkId,
      eventType: event.type,
    });

    await this.db
      .insert(organizations)
      .values(values)
      .onConflictDoUpdate({
        target: organizations.clerkId,
        set: omit(values, 'clerkId'),
      });
  }

  /**
   * Handles organizationMembership.created, updated, and deleted events.
   * Resolves Clerk IDs to internal UUIDs for FK columns before upserting.
   * Throws if referenced user or organization is not yet synced, causing
   * Svix to retry the webhook delivery.
   */
  private async handleMembershipEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'organizationMembership.deleted') {
      const clerkId = (event.data as unknown as Record<string, unknown>)
        .id as string;

      this.logger.log('Soft-deleting organization membership', { clerkId });

      await this.db
        .update(organizationMemberships)
        .set({ deletedAt: new Date() })
        .where(eq(organizationMemberships.clerkId, clerkId));

      return;
    }

    const data = event.data as unknown as OrganizationMembershipJSON;
    const mapped = mapMembershipPayload(data);
    const { clerkOrganizationId, clerkUserId, ...baseValues } = mapped;

    this.logger.log('Resolving FK references for membership', {
      clerkId: mapped.clerkId,
      clerkOrganizationId,
      clerkUserId,
    });

    // FK lookups: resolve Clerk IDs to internal UUIDs
    const [org] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkId, clerkOrganizationId));

    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUserId));

    if (!org || !user) {
      throw new Error(
        `Referenced entity not found: org=${!!org}, user=${!!user} ` +
          `(orgClerkId=${clerkOrganizationId}, userClerkId=${clerkUserId})`,
      );
    }

    const values = {
      ...baseValues,
      organizationId: org.id,
      userId: user.id,
    };

    this.logger.log('Upserting organization membership', {
      clerkId: mapped.clerkId,
      organizationId: org.id,
      userId: user.id,
      eventType: event.type,
    });

    await this.db
      .insert(organizationMemberships)
      .values(values)
      .onConflictDoUpdate({
        target: organizationMemberships.clerkId,
        set: omit(values, 'clerkId'),
      });
  }

  // ─── Entity Handlers (Phase 2) ───────────────────────────────────

  /**
   * Handles permission.created, permission.updated, and permission.deleted events.
   * Created/updated: idempotent upsert via INSERT ON CONFLICT DO UPDATE.
   * Deleted: soft delete by setting deletedAt.
   */
  private async handlePermissionEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'permission.deleted') {
      const clerkId = (event.data as unknown as Record<string, unknown>)
        .id as string;

      this.logger.log('Soft-deleting permission', { clerkId });

      await this.db
        .update(permissions)
        .set({ deletedAt: new Date() })
        .where(eq(permissions.clerkId, clerkId));

      return;
    }

    const data = event.data as unknown as Parameters<
      typeof mapPermissionPayload
    >[0];
    const values = mapPermissionPayload(data);

    this.logger.log('Upserting permission', {
      clerkId: values.clerkId,
      eventType: event.type,
    });

    await this.db
      .insert(permissions)
      .values(values)
      .onConflictDoUpdate({
        target: permissions.clerkId,
        set: omit(values, 'clerkId'),
      });
  }

  /**
   * Handles organizationDomain.created, updated, and deleted events.
   * Resolves Clerk organization ID to internal UUID for FK column before upserting.
   * Throws if referenced organization is not yet synced, causing Svix to retry.
   */
  private async handleDomainEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'organizationDomain.deleted') {
      const clerkId = (event.data as unknown as Record<string, unknown>)
        .id as string;

      this.logger.log('Soft-deleting organization domain', { clerkId });

      await this.db
        .update(organizationDomains)
        .set({ deletedAt: new Date() })
        .where(eq(organizationDomains.clerkId, clerkId));

      return;
    }

    const data = event.data as unknown as OrganizationDomainJSON;
    const mapped = mapDomainPayload(data);
    const { clerkOrganizationId, ...baseValues } = mapped;

    this.logger.log('Resolving FK reference for domain', {
      clerkId: mapped.clerkId,
      clerkOrganizationId,
    });

    const [org] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkId, clerkOrganizationId));

    if (!org) {
      throw new Error(
        `Referenced entity not found: org=false ` +
          `(orgClerkId=${clerkOrganizationId})`,
      );
    }

    const values = {
      ...baseValues,
      organizationId: org.id,
    };

    this.logger.log('Upserting organization domain', {
      clerkId: mapped.clerkId,
      organizationId: org.id,
      eventType: event.type,
    });

    await this.db
      .insert(organizationDomains)
      .values(values)
      .onConflictDoUpdate({
        target: organizationDomains.clerkId,
        set: omit(values, 'clerkId'),
      });
  }

  /**
   * Handles organizationInvitation.created, accepted, and revoked events.
   * Created: upsert with org FK lookup (userId is null).
   * Accepted: upsert with org + user FK lookups.
   * Revoked: soft delete by setting deletedAt.
   */
  private async handleInvitationEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'organizationInvitation.revoked') {
      const clerkId = (event.data as unknown as Record<string, unknown>)
        .id as string;

      this.logger.log('Soft-deleting organization invitation', { clerkId });

      await this.db
        .update(organizationInvitations)
        .set({ deletedAt: new Date() })
        .where(eq(organizationInvitations.clerkId, clerkId));

      return;
    }

    const data = event.data as unknown as OrganizationInvitationJSON;
    const mapped = mapInvitationPayload(data);
    const { clerkOrganizationId, ...baseValues } = mapped;

    this.logger.log('Resolving FK references for invitation', {
      clerkId: mapped.clerkId,
      clerkOrganizationId,
    });

    // FK lookup: resolve organization
    const [org] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkId, clerkOrganizationId));

    if (!org) {
      throw new Error(
        `Referenced entity not found: org=false ` +
          `(orgClerkId=${clerkOrganizationId})`,
      );
    }

    // FK lookup: resolve user on accepted events
    let userId: string | null = null;
    if (event.type === 'organizationInvitation.accepted') {
      const acceptedData = event.data as unknown as Record<string, unknown>;
      const clerkUserId = acceptedData.user_id as string;

      const [user] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkUserId));

      if (!user) {
        throw new Error(
          `Referenced entity not found: user=false ` +
            `(userClerkId=${clerkUserId})`,
        );
      }

      userId = user.id;
    }

    const values = {
      ...baseValues,
      organizationId: org.id,
      userId,
    };

    this.logger.log('Upserting organization invitation', {
      clerkId: mapped.clerkId,
      organizationId: org.id,
      userId,
      eventType: event.type,
    });

    await this.db
      .insert(organizationInvitations)
      .values(values)
      .onConflictDoUpdate({
        target: organizationInvitations.clerkId,
        set: omit(values, 'clerkId'),
      });
  }

  /**
   * Checks whether a previously logged event should be reprocessed.
   * An event that was logged but never successfully processed (processedAt is null)
   * is eligible for reprocessing — its error is cleared so the retry starts fresh.
   * An event that was already processed is a true duplicate and should be skipped.
   */
  private async shouldReprocessEvent(clerkEventId: string): Promise<boolean> {
    const [existing] = await this.db
      .select({ processedAt: webhookEvents.processedAt })
      .from(webhookEvents)
      .where(eq(webhookEvents.clerkEventId, clerkEventId));

    if (!existing || existing.processedAt !== null) {
      return false;
    }

    // Clear previous error so the retry starts clean
    await this.db
      .update(webhookEvents)
      .set({ error: null })
      .where(eq(webhookEvents.clerkEventId, clerkEventId));

    this.logger.log('Reprocessing previously failed event', { clerkEventId });

    return true;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  /**
   * Checks if a database error is a PostgreSQL unique constraint violation (23505).
   */
  private isUniqueViolation(error: unknown): boolean {
    return this.hasErrorCode(error, '23505');
  }

  /**
   * Checks if an error (or its `.cause`) carries a specific PostgreSQL error code.
   * Drizzle ORM wraps PG errors in DrizzleQueryError, placing the original
   * PG error (with its `code`) on `.cause`.
   */
  private hasErrorCode(error: unknown, code: string): boolean {
    if (typeof error !== 'object' || error === null) return false;
    if ('code' in error && (error as { code: string }).code === code)
      return true;
    if ('cause' in error) {
      const cause = (error as { cause: unknown }).cause;
      if (
        typeof cause === 'object' &&
        cause !== null &&
        'code' in cause &&
        (cause as { code: string }).code === code
      )
        return true;
    }
    return false;
  }
}
