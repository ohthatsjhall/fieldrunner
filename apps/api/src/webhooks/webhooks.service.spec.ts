import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import type { WebhookEvent } from '@clerk/backend';

jest.mock('svix', () => {
  const mockVerify = jest.fn();
  return {
    Webhook: jest.fn().mockImplementation(() => ({
      verify: mockVerify,
    })),
    __mockVerify: mockVerify,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockVerify: mockSvixVerify } = require('svix') as {
  __mockVerify: jest.Mock;
};

/**
 * Creates a mock Drizzle database client that supports method chaining.
 * Terminal operations (where, onConflictDoUpdate) resolve as Promises.
 * Intermediate operations (insert, update, select, values, set, from) return the mock for chaining.
 */
function createMockDb() {
  const mockDb: Record<string, jest.Mock> = {};

  // Terminal methods that resolve Promises
  mockDb.where = jest.fn().mockResolvedValue([]);
  mockDb.onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);

  // Intermediate chaining methods
  mockDb.insert = jest.fn().mockReturnValue(mockDb);
  mockDb.values = jest.fn().mockReturnValue(mockDb);
  mockDb.update = jest.fn().mockReturnValue(mockDb);
  mockDb.set = jest.fn().mockReturnValue(mockDb);
  mockDb.select = jest.fn().mockReturnValue(mockDb);
  mockDb.from = jest.fn().mockReturnValue(mockDb);

  return mockDb;
}

describe('WebhooksService', () => {
  let service: WebhooksService;
  let mockDb: ReturnType<typeof createMockDb>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_secret',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── verifyWebhook ─────────────────────────────────────────────────

  describe('verifyWebhook', () => {
    const svixHeaders = {
      'svix-id': 'msg_test123',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,abc123signature',
    };

    it('should successfully verify and return event on valid signature', () => {
      const mockEvent = {
        type: 'user.created',
        data: { id: 'user_123' },
      };
      mockSvixVerify.mockReturnValue(mockEvent);

      const rawBody = Buffer.from(JSON.stringify(mockEvent));
      const result = service.verifyWebhook(rawBody, svixHeaders);

      expect(result).toEqual(mockEvent);
    });

    it('should throw BadRequestException on invalid signature', () => {
      mockSvixVerify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const rawBody = Buffer.from('{}');

      expect(() => service.verifyWebhook(rawBody, svixHeaders)).toThrow(
        BadRequestException,
      );
      expect(() => service.verifyWebhook(rawBody, svixHeaders)).toThrow(
        'Invalid webhook signature',
      );
    });

    it('should pass correct parameters to svix Webhook.verify', () => {
      const mockEvent = { type: 'user.created', data: {} };
      mockSvixVerify.mockReturnValue(mockEvent);

      const rawBody = Buffer.from('{"test":"payload"}');
      service.verifyWebhook(rawBody, svixHeaders);

      expect(mockSvixVerify).toHaveBeenCalledWith(
        '{"test":"payload"}',
        svixHeaders,
      );
    });
  });

  // ─── logEvent ───────────────────────────────────────────────────────

  describe('logEvent', () => {
    it('should insert event into webhook_events table and return true', async () => {
      const result = await service.logEvent('evt_123', 'user.created', {
        id: 'user_456',
      });

      expect(result).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({
        clerkEventId: 'evt_123',
        eventType: 'user.created',
        payload: { id: 'user_456' },
      });
    });

    it('should return false for duplicate events that were already processed', async () => {
      // Simulate PostgreSQL unique_violation (23505)
      const uniqueError = Object.assign(new Error('unique violation'), {
        code: '23505',
      });
      mockDb.values.mockRejectedValueOnce(uniqueError);

      // shouldReprocessEvent: query returns already-processed event
      mockDb.where.mockResolvedValueOnce([
        { processedAt: new Date('2024-01-01') },
      ]);

      const result = await service.logEvent('evt_duplicate', 'user.created', {
        id: 'user_456',
      });

      expect(result).toBe(false);
    });

    it('should detect Drizzle-wrapped unique violation (code on .cause)', async () => {
      // Drizzle wraps PG errors — code is on .cause, not the error itself
      const pgError = Object.assign(new Error('unique violation'), {
        code: '23505',
      });
      const drizzleError = Object.assign(
        new Error('DrizzleQueryError: unique violation'),
        { cause: pgError },
      );
      mockDb.values.mockRejectedValueOnce(drizzleError);

      // shouldReprocessEvent: already processed
      mockDb.where.mockResolvedValueOnce([
        { processedAt: new Date('2024-01-01') },
      ]);

      const result = await service.logEvent('evt_drizzle_dup', 'user.created', {
        id: 'user_456',
      });

      expect(result).toBe(false);
    });

    it('should return true for duplicate of unprocessed event (retry path)', async () => {
      const uniqueError = Object.assign(new Error('unique violation'), {
        code: '23505',
      });
      mockDb.values.mockRejectedValueOnce(uniqueError);

      // shouldReprocessEvent: event exists but processedAt is null (failed previously)
      mockDb.where
        .mockResolvedValueOnce([{ processedAt: null }]) // select query
        .mockResolvedValueOnce(undefined); // update to clear error

      const result = await service.logEvent('evt_retry', 'user.created', {
        id: 'user_456',
      });

      expect(result).toBe(true);
      // Verify error was cleared
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ error: null });
    });

    it('should return true for Drizzle-wrapped duplicate of unprocessed event', async () => {
      const pgError = Object.assign(new Error('unique violation'), {
        code: '23505',
      });
      const drizzleError = Object.assign(
        new Error('DrizzleQueryError: unique violation'),
        { cause: pgError },
      );
      mockDb.values.mockRejectedValueOnce(drizzleError);

      // shouldReprocessEvent: unprocessed
      mockDb.where
        .mockResolvedValueOnce([{ processedAt: null }])
        .mockResolvedValueOnce(undefined);

      const result = await service.logEvent(
        'evt_drizzle_retry',
        'user.created',
        { id: 'user_456' },
      );

      expect(result).toBe(true);
    });

    it('should rethrow non-unique-violation database errors', async () => {
      const dbError = Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      });
      mockDb.values.mockRejectedValueOnce(dbError);

      await expect(
        service.logEvent('evt_123', 'user.created', { id: 'user_456' }),
      ).rejects.toThrow('connection refused');
    });
  });

  // ─── processEvent ───────────────────────────────────────────────────

  describe('processEvent', () => {
    it('should route user.created to handleUserEvent (upsert)', async () => {
      const event = {
        type: 'user.created',
        data: {
          id: 'user_123',
          first_name: 'John',
          last_name: 'Doe',
          email_addresses: [],
          primary_email_address_id: null,
          image_url: 'https://img.clerk.com/xxx',
          has_image: false,
          username: null,
          password_enabled: false,
          two_factor_enabled: false,
          banned: false,
          locked: false,
          external_id: null,
          public_metadata: {},
          private_metadata: {},
          unsafe_metadata: {},
          last_sign_in_at: null,
          last_active_at: null,
          created_at: 1690000000000,
          updated_at: 1690000000000,
        },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('should route user.updated to handleUserEvent (upsert)', async () => {
      const event = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          first_name: 'Jane',
          last_name: 'Doe',
          email_addresses: [],
          primary_email_address_id: null,
          image_url: 'https://img.clerk.com/xxx',
          has_image: false,
          username: null,
          password_enabled: false,
          two_factor_enabled: false,
          banned: false,
          locked: false,
          external_id: null,
          public_metadata: {},
          private_metadata: {},
          unsafe_metadata: {},
          last_sign_in_at: null,
          last_active_at: null,
          created_at: 1690000000000,
          updated_at: 1700000000000,
        },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('should route user.deleted to handleUserEvent (soft delete)', async () => {
      const event = {
        type: 'user.deleted',
        data: { id: 'user_123' },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should route organization.created to handleOrganizationEvent (upsert)', async () => {
      const event = {
        type: 'organization.created',
        data: {
          id: 'org_123',
          name: 'Acme',
          slug: 'acme',
          image_url: '',
          has_image: false,
          created_by: 'user_123',
          max_allowed_memberships: 10,
          members_count: 1,
          pending_invitations_count: 0,
          admin_delete_enabled: true,
          public_metadata: {},
          private_metadata: {},
          created_at: 1690000000000,
          updated_at: 1690000000000,
        },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('should route organization.deleted to handleOrganizationEvent (soft delete)', async () => {
      const event = {
        type: 'organization.deleted',
        data: { id: 'org_123' },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should route organizationMembership.created to handleMembershipEvent', async () => {
      // Mock FK lookups: organization and user found
      mockDb.where
        .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440000' }])
        .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440001' }])
        // Terminal .where for onConflictDoUpdate chain
        .mockResolvedValue(undefined);

      const event = {
        type: 'organizationMembership.created',
        data: {
          id: 'orgmem_123',
          organization: { id: 'org_123' },
          public_user_data: { user_id: 'user_123' },
          role: 'org:member',
          permissions: ['org:read'],
          public_metadata: {},
          private_metadata: {},
          created_at: 1690000000000,
          updated_at: 1690000000000,
        },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      // Two select calls for FK lookups, then insert with onConflictDoUpdate
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should route organizationMembership.deleted to handleMembershipEvent (soft delete)', async () => {
      const event = {
        type: 'organizationMembership.deleted',
        data: { id: 'orgmem_123' },
      } as unknown as WebhookEvent;

      await service.processEvent(event);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should not throw for unhandled event types (logs warning instead)', async () => {
      const event = {
        type: 'session.created',
        data: { id: 'sess_123' },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).resolves.toBeUndefined();
    });

    it('should handle invitation events without throwing (stub handler)', async () => {
      const event = {
        type: 'organizationInvitation.created',
        data: { id: 'inv_123' },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).resolves.toBeUndefined();
    });

    it('should handle domain events without throwing (stub handler)', async () => {
      const event = {
        type: 'organizationDomain.created',
        data: { id: 'dom_123' },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).resolves.toBeUndefined();
    });

    it('should handle role events without throwing (stub handler)', async () => {
      const event = {
        type: 'role.created',
        data: { id: 'role_123' },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).resolves.toBeUndefined();
    });

    it('should handle permission events without throwing (stub handler)', async () => {
      const event = {
        type: 'permission.created',
        data: { id: 'perm_123' },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).resolves.toBeUndefined();
    });

    it('should throw when membership FK lookup fails (org not found)', async () => {
      // org not found, user found
      mockDb.where
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: '550e8400-e29b-41d4-a716-446655440001' },
        ]);

      const event = {
        type: 'organizationMembership.created',
        data: {
          id: 'orgmem_123',
          organization: { id: 'org_missing' },
          public_user_data: { user_id: 'user_123' },
          role: 'org:member',
          permissions: null,
          public_metadata: {},
          private_metadata: {},
          created_at: 1690000000000,
          updated_at: 1690000000000,
        },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).rejects.toThrow(
        'Referenced entity not found',
      );
    });

    it('should throw when membership FK lookup fails (user not found)', async () => {
      // org found, user not found
      mockDb.where
        .mockResolvedValueOnce([{ id: '550e8400-e29b-41d4-a716-446655440000' }])
        .mockResolvedValueOnce([]);

      const event = {
        type: 'organizationMembership.created',
        data: {
          id: 'orgmem_123',
          organization: { id: 'org_123' },
          public_user_data: { user_id: 'user_missing' },
          role: 'org:member',
          permissions: null,
          public_metadata: {},
          private_metadata: {},
          created_at: 1690000000000,
          updated_at: 1690000000000,
        },
      } as unknown as WebhookEvent;

      await expect(service.processEvent(event)).rejects.toThrow(
        'Referenced entity not found',
      );
    });
  });

  // ─── markProcessed ──────────────────────────────────────────────────

  describe('markProcessed', () => {
    it('should update processedAt timestamp for the event', async () => {
      await service.markProcessed('evt_123');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          processedAt: expect.any(Date),
        }),
      );
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  // ─── markFailed ─────────────────────────────────────────────────────

  describe('markFailed', () => {
    it('should update error message for the event', async () => {
      await service.markFailed('evt_123', 'Something went wrong');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Something went wrong',
        }),
      );
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
