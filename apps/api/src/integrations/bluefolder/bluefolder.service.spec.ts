/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BlueFolderService } from './bluefolder.service';
import { BlueFolderClientService } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { BlueFolderUsersService } from './bluefolder-users.service';
import type {
  BfServiceRequestListItem,
  BfServiceRequestHistoryEntry,
} from './types/bluefolder-api.types';

function makeBfListItem(
  overrides: Partial<BfServiceRequestListItem> = {},
): BfServiceRequestListItem {
  return {
    accountManagerId: '10',
    billable: 'true',
    billableTotal: '100.00',
    billingStatus: 'billable',
    costTotal: '80.00',
    customerContactEmail: 'j@a.com',
    customerContactId: '5',
    customerContactName: 'John',
    customerContactPhone: '555',
    customerContactPhoneMobile: '666',
    customerId: '1',
    customerLocationCity: 'Austin',
    customerLocationCountry: 'US',
    customerLocationId: '1',
    customerLocationName: 'Main',
    customerLocationNotes: '',
    customerLocationPostalCode: '78701',
    customerLocationState: 'TX',
    customerLocationStreetAddress: '123 St',
    customerLocationZone: '',
    customerName: 'Acme',
    dateTimeCreated: '2024-01-01T00:00:00Z',
    dateTimeClosed: '',
    description: 'Test SR',
    detailedDescription: 'Details',
    dueDate: '',
    externalId: '',
    priority: 'Normal',
    priorityLabel: 'Normal',
    serviceManagerId: '20',
    serviceRequestId: '1001',
    status: 'New',
    timeOpen_hours: '24',
    type: 'Maintenance',
    ...overrides,
  };
}

function makeMinimalBfDetail(overrides: Record<string, unknown> = {}) {
  return {
    serviceRequestId: '1001',
    description: 'Test',
    detailedDescription: '',
    status: 'In Progress',
    priority: 'High',
    type: 'Maintenance',
    billable: 'true',
    billableTotal: '500',
    costTotal: '300',
    customerId: '1',
    customerName: 'Acme',
    customerContactId: '0',
    customerContactName: '',
    customerContactEmail: '',
    customerContactPhone: '',
    customerContactPhoneMobile: '',
    customerLocationId: '0',
    customerLocationName: '',
    customerLocationStreetAddress: '',
    customerLocationCity: '',
    customerLocationState: '',
    customerLocationPostalCode: '',
    customerLocationCountry: '',
    customerLocationZone: '',
    customerLocationNotes: '',
    accountManagerId: '10',
    serviceManagerId: '20',
    dateTimeCreated: '2024-01-01T00:00:00Z',
    dateTimeClosed: '',
    dueDate: '',
    externalId: '',
    statusAge_hours: '48',
    statusLastUpdated: '',
    createdByUserId: '5',
    purchaseOrderNo: '',
    referenceNo: '',
    linkedToServiceRequestId: '',
    sourceName: '',
    sourceId: '',
    sourceType: '',
    billableExpensesPrice: '0',
    billableLaborHours: '0',
    billableLaborPrice: '0',
    billableMaterialsPrice: '0',
    nonBillableExpensesPrice: '0',
    nonBillableLaborHours: '0',
    nonBillableLaborPrice: '0',
    nonBillableMaterialsPrice: '0',
    nonBillableTotal: '0',
    billToAddressId: '',
    billToAddressName: '',
    billToCity: '',
    billToCountry: '',
    billToId: '',
    billToName: '',
    billToPostalCode: '',
    billToState: '',
    billToStreetAddress: '',
    costExpenses: '0',
    costLabor: '0',
    costMaterials: '0',
    customerAction: '',
    dateTimeExportedForBilling: '',
    requestDetails: '',
    requestVerified: 'false',
    serviceContractId: '',
    taxCodeId: '',
    taxRate: '0',
    assignments: { assignment: [] },
    customFields: { customField: [] },
    labor: { laborItem: [] },
    materials: { materialsItem: [] },
    expenses: { expenseItem: [] },
    log: { logEntry: [] },
    equipmentToService: { equipmentItem: [] },
    ...overrides,
  };
}

describe('BlueFolderService', () => {
  let service: BlueFolderService;
  let mockClient: jest.Mocked<BlueFolderClientService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockUsersService: jest.Mocked<BlueFolderUsersService>;

  const clerkOrgId = 'org_test123';
  const internalOrgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockClient = {
      request: jest.fn(),
      buildAuthHeader: jest.fn(),
      buildRequestXml: jest.fn(),
      parseResponseXml: jest.fn(),
    } as jest.Mocked<BlueFolderClientService>;

    mockSettings = {
      getDecryptedApiKey: jest.fn(),
      resolveOrgId: jest.fn().mockResolvedValue(internalOrgId),
      getSettings: jest.fn(),
      saveApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    mockUsersService = {
      sync: jest.fn(),
      buildUserMap: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<BlueFolderUsersService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlueFolderService,
        { provide: BlueFolderClientService, useValue: mockClient },
        { provide: OrganizationSettingsService, useValue: mockSettings },
        { provide: BlueFolderUsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get(BlueFolderService);
  });

  describe('listServiceRequests', () => {
    it('should throw BadRequestException when no API key configured', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue(null);

      await expect(service.listServiceRequests(clerkOrgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return mapped service request summaries', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequestList: {
          serviceRequest: [
            makeBfListItem({ serviceRequestId: '1', status: 'New' }),
            makeBfListItem({ serviceRequestId: '2', status: 'Closed' }),
          ],
        },
      });

      const result = await service.listServiceRequests(clerkOrgId);

      expect(result).toHaveLength(2);
      expect(result[0].serviceRequestId).toBe(1);
      expect(result[0].isOpen).toBe(true);
      expect(result[1].serviceRequestId).toBe(2);
      expect(result[1].isOpen).toBe(false);
    });

    it('should pass filters to the API client', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequestList: { serviceRequest: [] },
      });

      await service.listServiceRequests(clerkOrgId, { status: 'open' });

      expect(mockClient.request).toHaveBeenCalledWith(
        'serviceRequests/list.aspx',
        'api-key',
        expect.objectContaining({ listType: 'basic', status: 'open' }),
      );
    });

    it('should handle empty service request list', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequestList: { serviceRequest: [] },
      });

      const result = await service.listServiceRequests(clerkOrgId);
      expect(result).toEqual([]);
    });

    it('should handle undefined serviceRequestList', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({});

      const result = await service.listServiceRequests(clerkOrgId);
      expect(result).toEqual([]);
    });

    it('should populate manager names on summaries', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequestList: {
          serviceRequest: [
            makeBfListItem({ accountManagerId: '10', serviceManagerId: '20' }),
          ],
        },
      });
      mockUsersService.buildUserMap.mockResolvedValue(
        new Map([
          [10, 'Alice Manager'],
          [20, 'Bob Service'],
        ]),
      );

      const result = await service.listServiceRequests(clerkOrgId);

      expect(result[0].accountManagerName).toBe('Alice Manager');
      expect(result[0].serviceManagerName).toBe('Bob Service');
    });
  });

  describe('getServiceRequest', () => {
    it('should throw BadRequestException when no API key configured', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue(null);

      await expect(service.getServiceRequest(clerkOrgId, 1001)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return mapped service request detail', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequest: makeMinimalBfDetail(),
      });

      const result = await service.getServiceRequest(clerkOrgId, 1001);

      expect(result.serviceRequestId).toBe(1001);
      expect(result.status).toBe('In Progress');
      expect(result.statusAgeHours).toBe(48);
    });

    it('should pass serviceRequestId as string to client', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequest: makeMinimalBfDetail({ serviceRequestId: '42' }),
      });

      await service.getServiceRequest(clerkOrgId, 42);

      expect(mockClient.request).toHaveBeenCalledWith(
        'serviceRequests/get.aspx',
        'api-key',
        { serviceRequestId: '42' },
      );
    });

    it('should populate all *Name fields from user map', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequest: makeMinimalBfDetail({
          accountManagerId: '10',
          serviceManagerId: '20',
          createdByUserId: '5',
          labor: {
            laborItem: [
              {
                id: '1',
                serviceRequestId: '1001',
                userId: '30',
                dateWorked: '2024-01-01',
                duration: '2',
                startTime: '09:00',
                billingStatus: 'billable',
                billable: 'true',
                itemDescription: 'Work',
                itemId: '1',
                itemIsFlatRate: 'false',
                itemUnitCost: '0',
                itemUnitListPrice: '0',
                itemUnitPrice: '50',
                totalCost: '0',
                totalPrice: '100',
                totalPriceBillable: '100',
                taxable: 'false',
                comment: '',
                commentIsPublic: 'false',
                dateTimeCreated: '2024-01-01T00:00:00Z',
                createdByUserId: '5',
                apptId: '0',
                billingContractId: '0',
              },
            ],
          },
          log: {
            logEntry: [
              {
                id: '1',
                serviceRequestId: '1001',
                entryType: 'comment',
                description: 'Log',
                comment: '',
                commentIsPublic: 'false',
                dateTimeCreated: '2024-01-01T00:00:00Z',
                createdByUserId: '5',
              },
            ],
          },
        }),
      });
      mockUsersService.buildUserMap.mockResolvedValue(
        new Map([
          [10, 'Alice Manager'],
          [20, 'Bob Service'],
          [5, 'Charlie Creator'],
          [30, 'Dave Worker'],
        ]),
      );

      const result = await service.getServiceRequest(clerkOrgId, 1001);

      expect(result.accountManagerName).toBe('Alice Manager');
      expect(result.serviceManagerName).toBe('Bob Service');
      expect(result.createdByUserName).toBe('Charlie Creator');
      expect(result.labor[0].userName).toBe('Dave Worker');
      expect(result.labor[0].createdByUserName).toBe('Charlie Creator');
      expect(result.log[0].createdByUserName).toBe('Charlie Creator');
    });

    it('should show "User #ID" for unresolved IDs', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequest: makeMinimalBfDetail({
          accountManagerId: '999',
          createdByUserId: '888',
        }),
      });
      mockUsersService.buildUserMap.mockResolvedValue(new Map());

      const result = await service.getServiceRequest(clerkOrgId, 1001);

      expect(result.accountManagerName).toBe('User #999');
      expect(result.createdByUserName).toBe('User #888');
    });

    it('should produce null names for null/0 user IDs', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequest: makeMinimalBfDetail({
          accountManagerId: '',
          serviceManagerId: '0',
          createdByUserId: '0',
        }),
      });

      const result = await service.getServiceRequest(clerkOrgId, 1001);

      expect(result.accountManagerName).toBeNull();
      expect(result.serviceManagerName).toBeNull();
      expect(result.createdByUserName).toBeNull();
    });
  });

  describe('getServiceRequestHistory', () => {
    it('should throw BadRequestException when no API key configured', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue(null);

      await expect(
        service.getServiceRequestHistory(clerkOrgId, 1001),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return history entries from API', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      const entries: BfServiceRequestHistoryEntry[] = [
        {
          id: '1',
          serviceRequestId: '1001',
          entryType: 'Status Changed',
          entryDate: '2024-01-15T10:00:00Z',
          description: 'Status changed from [New] to [Assigned].',
        },
      ];
      mockClient.request.mockResolvedValue({
        serviceRequestHistoryList: { serviceRequestHistory: entries },
      });

      const result = await service.getServiceRequestHistory(clerkOrgId, 1001);

      expect(result).toEqual(entries);
      expect(mockClient.request).toHaveBeenCalledWith(
        'serviceRequests/getHistory.aspx',
        'api-key',
        { serviceRequestId: '1001' },
      );
    });

    it('should return empty array when no history entries exist', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({});

      const result = await service.getServiceRequestHistory(clerkOrgId, 1001);

      expect(result).toEqual([]);
    });
  });

  describe('getServiceRequestHistoryWithKey', () => {
    it('should call client with provided API key directly', async () => {
      const entries: BfServiceRequestHistoryEntry[] = [
        {
          id: '2',
          serviceRequestId: '1001',
          entryType: 'Created',
          entryDate: '2024-01-01T00:00:00Z',
          description: 'Service request created.',
        },
      ];
      mockClient.request.mockResolvedValue({
        serviceRequestHistoryList: { serviceRequestHistory: entries },
      });

      const result = await service.getServiceRequestHistoryWithKey(
        'direct-key',
        1001,
      );

      expect(result).toEqual(entries);
      expect(mockClient.request).toHaveBeenCalledWith(
        'serviceRequests/getHistory.aspx',
        'direct-key',
        { serviceRequestId: '1001' },
      );
    });

    it('should return empty array when serviceRequestHistoryList is missing', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await service.getServiceRequestHistoryWithKey(
        'api-key',
        1001,
      );

      expect(result).toEqual([]);
    });
  });
});
