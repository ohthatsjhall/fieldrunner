/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ServiceRequestsService } from './service-requests.service';
import { BlueFolderService } from './bluefolder.service';
import { BlueFolderUsersService } from './bluefolder-users.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import { SYNC_COMPLETED } from '../../common/events/sync.events';
import type { ServiceRequestSummary } from '@fieldrunner/shared';

function makeSummary(
  overrides: Partial<ServiceRequestSummary> = {},
): ServiceRequestSummary {
  return {
    serviceRequestId: 1001,
    description: 'Fix HVAC unit',
    detailedDescription: '',
    status: 'New',
    priority: 'Normal',
    priorityLabel: 'Normal',
    type: 'Maintenance',
    billable: true,
    billableTotal: 100,
    billingStatus: 'billable',
    costTotal: 80,
    externalId: null,
    dateTimeCreated: '2024-01-01T00:00:00Z',
    dateTimeClosed: null,
    dueDate: null,
    timeOpenHours: 24,
    customerId: 1,
    customerName: 'Acme Corp',
    customerContactId: 5,
    customerContactName: 'John',
    customerContactEmail: 'j@a.com',
    customerContactPhone: '555',
    customerContactPhoneMobile: '666',
    customerLocationId: 1,
    customerLocationName: 'Main',
    customerLocationStreetAddress: '123 St',
    customerLocationCity: 'Austin',
    customerLocationState: 'TX',
    customerLocationPostalCode: '78701',
    customerLocationCountry: 'US',
    customerLocationZone: '',
    customerLocationNotes: '',
    accountManagerId: null,
    accountManagerName: null,
    serviceManagerId: null,
    serviceManagerName: null,
    isOverdue: false,
    isOpen: true,
    ...overrides,
  };
}

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService;
  let mockBlueFolderService: jest.Mocked<BlueFolderService>;
  let mockUsersService: jest.Mocked<BlueFolderUsersService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockDb: any;

  const clerkOrgId = 'org_test123';
  const internalOrgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockBlueFolderService = {
      listServiceRequests: jest.fn(),
      getServiceRequest: jest.fn(),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<BlueFolderService>;

    mockUsersService = {
      sync: jest.fn().mockResolvedValue({ total: 0, syncedAt: new Date() }),
      buildUserMap: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<BlueFolderUsersService>;

    mockSettings = {
      resolveOrgId: jest.fn().mockResolvedValue(internalOrgId),
      getDecryptedApiKey: jest.fn(),
      getSettings: jest.fn(),
      saveApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      innerJoin: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestsService,
        { provide: BlueFolderService, useValue: mockBlueFolderService },
        { provide: BlueFolderUsersService, useValue: mockUsersService },
        { provide: OrganizationSettingsService, useValue: mockSettings },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get(ServiceRequestsService);
  });

  describe('sync', () => {
    it('should fetch from BlueFolder and upsert to DB', async () => {
      const items = [
        makeSummary({ serviceRequestId: 1001, status: 'New', isOpen: true }),
        makeSummary({
          serviceRequestId: 1002,
          status: 'Closed',
          isOpen: false,
        }),
      ];
      mockBlueFolderService.listServiceRequests.mockResolvedValue(items);

      const result = await service.sync(clerkOrgId);

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith(clerkOrgId);
      expect(mockBlueFolderService.listServiceRequests).toHaveBeenCalledWith(
        clerkOrgId,
      );
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.total).toBe(2);
      expect(result.syncedAt).toBeInstanceOf(Date);
    });

    it('should return zero total when BlueFolder returns empty list', async () => {
      mockBlueFolderService.listServiceRequests.mockResolvedValue([]);

      const result = await service.sync(clerkOrgId);

      expect(result.total).toBe(0);
      expect(result.syncedAt).toBeInstanceOf(Date);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should resolve org ID before syncing', async () => {
      mockBlueFolderService.listServiceRequests.mockResolvedValue([]);

      await service.sync(clerkOrgId);

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith(clerkOrgId);
    });

    it('should call user sync before SR sync', async () => {
      const callOrder: string[] = [];
      mockUsersService.sync.mockImplementation(async () => {
        callOrder.push('userSync');
        return { total: 5, syncedAt: new Date() };
      });
      mockBlueFolderService.listServiceRequests.mockImplementation(async () => {
        callOrder.push('srList');
        return [];
      });

      await service.sync(clerkOrgId);

      expect(callOrder).toEqual(['userSync', 'srList']);
    });

    it.each([
      {
        label: 'serviceManager present',
        serviceManagerName: 'Alice',
        accountManagerName: 'Bob',
        expected: 'Alice',
      },
      {
        label: 'serviceManager null, falls back to accountManager',
        serviceManagerName: null,
        accountManagerName: 'Charlie',
        expected: 'Charlie',
      },
      {
        label: 'both null',
        serviceManagerName: null,
        accountManagerName: null,
        expected: null,
      },
    ])(
      'should map assigneeName correctly when $label',
      async ({ serviceManagerName, accountManagerName, expected }) => {
        mockBlueFolderService.listServiceRequests.mockResolvedValue([
          makeSummary({ serviceManagerName, accountManagerName }),
        ]);

        await service.sync(clerkOrgId);

        const upsertedRows = mockDb.values.mock.calls[0][0];
        expect(upsertedRows[0].assigneeName).toBe(expected);
      },
    );

    it('should emit sync.completed event with clerkOrgId and organizationId', async () => {
      mockBlueFolderService.listServiceRequests.mockResolvedValue([
        makeSummary(),
      ]);

      await service.sync(clerkOrgId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SYNC_COMPLETED, {
        clerkOrgId,
        organizationId: internalOrgId,
      });
    });

    it('should not emit sync.completed when no items to sync', async () => {
      mockBlueFolderService.listServiceRequests.mockResolvedValue([]);

      await service.sync(clerkOrgId);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should continue SR sync even if user sync fails', async () => {
      mockUsersService.sync.mockRejectedValue(new Error('User API down'));
      mockBlueFolderService.listServiceRequests.mockResolvedValue([]);

      const result = await service.sync(clerkOrgId);

      expect(result.total).toBe(0);
      expect(mockBlueFolderService.listServiceRequests).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should resolve org ID and query the DB', async () => {
      mockDb.limit.mockResolvedValue(undefined);
      mockDb.orderBy.mockResolvedValue([]);

      await service.findAll(clerkOrgId);

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith(clerkOrgId);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should compute stats from DB rows', async () => {
      const dbRows = [
        { status: 'New', isOpen: true },
        { status: 'In Progress', isOpen: true },
        { status: 'Assigned', isOpen: true },
        { status: 'Closed', isOpen: false },
        { status: 'NEW', isOpen: true },
      ];
      mockDb.orderBy.mockResolvedValue(dbRows);

      const stats = await service.getStats(clerkOrgId);

      expect(stats).toEqual({
        newCount: 2,
        inProgress: 1,
        assigned: 1,
        open: 4,
      });
    });

    it('should return all zeros for empty DB', async () => {
      mockDb.orderBy.mockResolvedValue([]);

      const stats = await service.getStats(clerkOrgId);

      expect(stats).toEqual({
        newCount: 0,
        inProgress: 0,
        assigned: 0,
        open: 0,
      });
    });
  });

  describe('getLastSyncedAt', () => {
    it('should return the max synced_at for the org', async () => {
      const syncedAt = new Date('2024-06-01T12:00:00Z');
      mockDb.limit.mockResolvedValue([{ syncedAt }]);

      const result = await service.getLastSyncedAt(clerkOrgId);

      expect(result).toEqual(syncedAt);
    });

    it('should return null when no rows exist', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await service.getLastSyncedAt(clerkOrgId);

      expect(result).toBeNull();
    });
  });

  describe('syncAll', () => {
    let delaySpy: jest.SpyInstance;

    beforeEach(() => {
      delaySpy = jest
        .spyOn(service as any, 'delay')
        .mockResolvedValue(undefined);
    });

    it('should sync each org that has a BlueFolder API key', async () => {
      mockDb.where.mockResolvedValue([
        { clerkId: 'org_aaa' },
        { clerkId: 'org_bbb' },
      ]);
      mockBlueFolderService.listServiceRequests.mockResolvedValue([]);

      await service.syncAll();

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith('org_aaa');
      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith('org_bbb');
      expect(mockBlueFolderService.listServiceRequests).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should stagger 3s between orgs but not after the last', async () => {
      mockDb.where.mockResolvedValue([
        { clerkId: 'org_aaa' },
        { clerkId: 'org_bbb' },
        { clerkId: 'org_ccc' },
      ]);
      mockBlueFolderService.listServiceRequests.mockResolvedValue([]);

      await service.syncAll();

      expect(delaySpy).toHaveBeenCalledTimes(2);
      expect(delaySpy).toHaveBeenCalledWith(3000);
    });

    it('should skip when no orgs have API keys', async () => {
      mockDb.where.mockResolvedValue([]);

      await service.syncAll();

      expect(mockBlueFolderService.listServiceRequests).not.toHaveBeenCalled();
    });

    it('should continue syncing other orgs if one fails', async () => {
      mockDb.where.mockResolvedValue([
        { clerkId: 'org_fail' },
        { clerkId: 'org_ok' },
      ]);
      mockBlueFolderService.listServiceRequests
        .mockRejectedValueOnce(new Error('API down'))
        .mockResolvedValueOnce([]);

      await service.syncAll();

      expect(mockBlueFolderService.listServiceRequests).toHaveBeenCalledTimes(
        2,
      );
    });
  });
});
