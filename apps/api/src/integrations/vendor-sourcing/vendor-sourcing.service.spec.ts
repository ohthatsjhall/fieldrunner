/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VendorSourcingService } from './vendor-sourcing.service';
import { BlueFolderService } from '../bluefolder/bluefolder.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { NominatimProvider } from './providers/nominatim.provider';
import { GooglePlacesProvider } from './providers/google-places.provider';
import { SearchQueryGeneratorService } from './providers/search-query-generator.service';
import { VendorScoringService } from './scoring/vendor-scoring.service';
import { TradeCategoriesService } from './trade-categories/trade-categories.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import type { ServiceRequestDetail } from '@fieldrunner/shared';

function makeSrDetail(
  overrides: Partial<ServiceRequestDetail> = {},
): ServiceRequestDetail {
  return {
    serviceRequestId: 2270,
    description: 'Fix leaking pipe',
    detailedDescription: 'Kitchen sink leaking',
    status: 'Open',
    priority: 'Normal',
    priorityLabel: 'Normal',
    type: 'Maintenance',
    billable: true,
    billableTotal: 0,
    billingStatus: 'billable',
    costTotal: 0,
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
    customerLocationName: 'Main Office',
    customerLocationStreetAddress: '123 Main St',
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
    createdByUserId: null,
    createdByUserName: null,
    isOverdue: false,
    isOpen: true,
    assignments: [],
    labor: [],
    materials: [],
    expenses: [],
    log: [],
    equipment: [],
    customFields: [{ name: 'Category', value: 'Plumbing' }],
    history: [],
    ...overrides,
  };
}

describe('VendorSourcingService', () => {
  let service: VendorSourcingService;
  let mockBlueFolderService: jest.Mocked<BlueFolderService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockNominatim: jest.Mocked<NominatimProvider>;
  let mockGooglePlaces: jest.Mocked<GooglePlacesProvider>;
  let mockQueryGenerator: jest.Mocked<SearchQueryGeneratorService>;
  let mockScoring: VendorScoringService;
  let mockTradeCategories: jest.Mocked<TradeCategoriesService>;
  let mockDb: any;

  const clerkOrgId = 'org_test123';
  const internalOrgId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockBlueFolderService = {
      getServiceRequest: jest.fn().mockResolvedValue(makeSrDetail()),
    } as unknown as jest.Mocked<BlueFolderService>;

    mockSettings = {
      resolveOrgId: jest.fn().mockResolvedValue(internalOrgId),
    } as unknown as jest.Mocked<OrganizationSettingsService>;

    mockNominatim = {
      geocode: jest.fn().mockResolvedValue({
        latitude: 30.2672,
        longitude: -97.7431,
        displayName: 'Austin, TX',
      }),
    } as unknown as jest.Mocked<NominatimProvider>;

    mockGooglePlaces = {
      name: 'google_places',
      search: jest.fn().mockResolvedValue([
        {
          sourceId: 'ChIJ_test1',
          source: 'google_places',
          name: 'Best Plumber',
          phone: '+1 512-555-0001',
          address: '100 Test St, Austin, TX',
          streetAddress: '100 Test St',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          country: 'US',
          latitude: 30.27,
          longitude: -97.74,
          website: 'https://bestplumber.com',
          rating: 4.8,
          reviewCount: 200,
          types: ['plumber'],
          businessHours: { openNow: true },
          rawData: {},
        },
        {
          sourceId: 'ChIJ_test2',
          source: 'google_places',
          name: 'Quick Fix',
          phone: '+1 512-555-0002',
          address: '200 Oak Ave, Austin, TX',
          streetAddress: '200 Oak Ave',
          city: 'Austin',
          state: 'TX',
          postalCode: '78702',
          country: 'US',
          latitude: 30.28,
          longitude: -97.75,
          website: null,
          rating: 4.2,
          reviewCount: 50,
          types: ['plumber', 'establishment'],
          businessHours: null,
          rawData: {},
        },
      ]),
    } as unknown as jest.Mocked<GooglePlacesProvider>;

    mockQueryGenerator = {
      generateSearchQueries: jest.fn().mockResolvedValue({
        queries: ['plumber', 'plumbing contractor'],
        category: 'Plumbing',
        reasoning: 'SR describes a leaking pipe which requires a plumber.',
      }),
    } as unknown as jest.Mocked<SearchQueryGeneratorService>;

    mockScoring = new VendorScoringService();

    mockTradeCategories = {
      seedDefaults: jest.fn().mockResolvedValue(undefined),
      resolveSearchQueries: jest.fn().mockResolvedValue({
        categoryId: 'cat-uuid',
        queries: ['plumber', 'plumbing contractor'],
        matchLevel: 'exact',
      }),
      findAll: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<TradeCategoriesService>;

    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'session-uuid' }]),
      onConflictDoUpdate: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorSourcingService,
        { provide: BlueFolderService, useValue: mockBlueFolderService },
        { provide: OrganizationSettingsService, useValue: mockSettings },
        { provide: NominatimProvider, useValue: mockNominatim },
        { provide: GooglePlacesProvider, useValue: mockGooglePlaces },
        { provide: SearchQueryGeneratorService, useValue: mockQueryGenerator },
        { provide: VendorScoringService, useValue: mockScoring },
        { provide: TradeCategoriesService, useValue: mockTradeCategories },
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();

    service = module.get(VendorSourcingService);
  });

  describe('search', () => {
    it('should fetch SR detail, geocode, search providers, and return ranked results', async () => {
      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(mockSettings.resolveOrgId).toHaveBeenCalledWith(clerkOrgId);
      expect(mockBlueFolderService.getServiceRequest).toHaveBeenCalledWith(
        clerkOrgId,
        2270,
      );
      expect(mockNominatim.geocode).toHaveBeenCalled();
      expect(mockGooglePlaces.search).toHaveBeenCalled();
      expect(result.status).toBe('completed');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].rank).toBe(1);
      expect(result.candidates[0].score).toBeGreaterThan(0);
    });

    it('should use Claude to generate search queries from SR detail', async () => {
      await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(mockQueryGenerator.generateSearchQueries).toHaveBeenCalledWith(
        expect.objectContaining({ serviceRequestId: 2270 }),
      );
    });

    it('should run multiple queries from Claude and deduplicate results', async () => {
      mockQueryGenerator.generateSearchQueries.mockResolvedValue({
        queries: ['plumber', 'pipe repair'],
        category: 'Plumbing',
        reasoning: 'test',
      });

      await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      // Should call Google Places for each query
      expect(mockGooglePlaces.search).toHaveBeenCalledTimes(2);
    });

    it('should support ad-hoc search without SR', async () => {
      const result = await service.search(clerkOrgId, {
        address: '456 Oak Ave, Austin, TX',
        tradeCategory: 'Electrical',
      });

      expect(mockBlueFolderService.getServiceRequest).not.toHaveBeenCalled();
      expect(mockNominatim.geocode).toHaveBeenCalledWith(
        '456 Oak Ave, Austin, TX',
      );
      expect(result.status).toBe('completed');
    });

    it('should handle geocoding failure gracefully', async () => {
      mockNominatim.geocode.mockResolvedValue(null);

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      // Should fall back to postal code geocoding
      expect(mockNominatim.geocode).toHaveBeenCalledTimes(2);
    });

    it('should mark session as failed on total geocoding failure', async () => {
      mockNominatim.geocode.mockResolvedValue(null);

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(result.status).toBe('failed');
    });

    it('should seed default trade categories on first use', async () => {
      await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(mockTradeCategories.seedDefaults).toHaveBeenCalledWith(
        internalOrgId,
      );
    });
  });
});
