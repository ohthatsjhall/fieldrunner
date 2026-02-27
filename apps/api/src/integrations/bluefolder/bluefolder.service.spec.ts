/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BlueFolderService } from './bluefolder.service';
import { BlueFolderClientService } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../organization-settings/organization-settings.service';
import type { BfServiceRequestListItem } from './types/bluefolder-api.types';

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
    serviceManagerId: '',
    serviceRequestId: '1001',
    status: 'New',
    timeOpen_hours: '24',
    type: 'Maintenance',
    ...overrides,
  };
}

describe('BlueFolderService', () => {
  let service: BlueFolderService;
  let mockClient: jest.Mocked<BlueFolderClientService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;

  const clerkOrgId = 'org_test123';

  beforeEach(async () => {
    mockClient = {
      request: jest.fn(),
      buildAuthHeader: jest.fn(),
      buildRequestXml: jest.fn(),
      parseResponseXml: jest.fn(),
    } as jest.Mocked<BlueFolderClientService>;

    mockSettings = {
      getDecryptedApiKey: jest.fn(),
      resolveOrgId: jest.fn(),
      getSettings: jest.fn(),
      saveApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlueFolderService,
        { provide: BlueFolderClientService, useValue: mockClient },
        {
          provide: OrganizationSettingsService,
          useValue: mockSettings,
        },
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
        serviceRequest: {
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
          accountManagerId: '',
          serviceManagerId: '',
          dateTimeCreated: '2024-01-01T00:00:00Z',
          dateTimeClosed: '',
          dueDate: '',
          externalId: '',
          statusAge_hours: '48',
          statusLastUpdated: '',
          createdByUserId: '1',
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
        },
      });

      const result = await service.getServiceRequest(clerkOrgId, 1001);

      expect(result.serviceRequestId).toBe(1001);
      expect(result.status).toBe('In Progress');
      expect(result.statusAgeHours).toBe(48);
    });

    it('should pass serviceRequestId as string to client', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequest: {
          serviceRequestId: '42',
          description: '',
          detailedDescription: '',
          status: 'New',
          priority: '',
          type: '',
          billable: 'false',
          billableTotal: '0',
          costTotal: '0',
          customerId: '0',
          customerName: '',
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
          accountManagerId: '',
          serviceManagerId: '',
          dateTimeCreated: '',
          dateTimeClosed: '',
          dueDate: '',
          externalId: '',
          statusAge_hours: '0',
          statusLastUpdated: '',
          createdByUserId: '0',
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
        },
      });

      await service.getServiceRequest(clerkOrgId, 42);

      expect(mockClient.request).toHaveBeenCalledWith(
        'serviceRequests/get.aspx',
        'api-key',
        { serviceRequestId: '42' },
      );
    });
  });

  describe('getStats', () => {
    it('should compute stats from the list', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequestList: {
          serviceRequest: [
            makeBfListItem({ status: 'New', dueDate: '2020-01-01T00:00:00' }),
            makeBfListItem({ status: 'In Progress', dueDate: '' }),
            makeBfListItem({ status: 'Closed', dueDate: '' }),
          ],
        },
      });

      const stats = await service.getStats(clerkOrgId);

      expect(stats.total).toBe(3);
      expect(stats.open).toBe(2);
      expect(stats.closed).toBe(1);
      expect(stats.overdue).toBe(1);
    });

    it('should return all zeros for empty list', async () => {
      mockSettings.getDecryptedApiKey.mockResolvedValue('api-key');
      mockClient.request.mockResolvedValue({
        serviceRequestList: { serviceRequest: [] },
      });

      const stats = await service.getStats(clerkOrgId);
      expect(stats).toEqual({ total: 0, open: 0, closed: 0, overdue: 0 });
    });
  });
});
