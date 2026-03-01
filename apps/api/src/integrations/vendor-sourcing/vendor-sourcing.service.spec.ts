/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VendorSourcingService } from './vendor-sourcing.service';
import { BlueFolderService } from '../bluefolder/bluefolder.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { NominatimProvider } from './providers/nominatim.provider';
import { GooglePlacesProvider } from './providers/google-places.provider';
import { BuildZoomProvider } from './providers/buildzoom.provider';
import { SearchQueryGeneratorService } from './providers/search-query-generator.service';
import { VendorScoringService } from './scoring/vendor-scoring.service';
import { TradeCategoriesService } from './trade-categories/trade-categories.service';
import { EmailEnrichmentService } from './enrichment/email-enrichment.service';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import type { NormalizedPlace } from './providers/provider.interface';

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

function makeGooglePlace(overrides: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
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
    email: null,
    rating: 4.8,
    reviewCount: 200,
    types: ['plumber'],
    businessHours: { openNow: true },
    rawData: {},
    ...overrides,
  };
}

function makeBzPlace(overrides: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    sourceId: 'https://www.buildzoom.com/contractor/bz-plumbing',
    source: 'buildzoom',
    name: 'BZ Plumbing',
    phone: '(512) 555-9999',
    address: '300 Elm St, Austin, TX 78703',
    streetAddress: null,
    city: 'Austin',
    state: 'TX',
    postalCode: null,
    country: 'US',
    latitude: null,
    longitude: null,
    website: null,
    email: null,
    rating: null,
    reviewCount: 3,
    types: ['Plumbing'],
    businessHours: null,
    rawData: {
      url: 'https://www.buildzoom.com/contractor/bz-plumbing',
      contractorName: 'BZ Plumbing',
      phoneNumber: '(512) 555-9999',
      location: 'Austin, TX',
      fullAddress: '300 Elm St, Austin, TX 78703',
      bzScore: '130',
      totalProjectsLastXYears: 20,
      totalPermittedProjects: 60,
      insurer: 'State Farm',
      reviewsCount: 3,
      servicesOffered: ['Plumbing'],
      licenses: [
        {
          licenseNumber: 'TX-111',
          licenseStatus: 'Active',
          licenseCity: 'Austin',
          licenseType: 'Plumber',
          licenseBusinessType: 'LLC',
          licenseVerificationDate: 'Jan 2026',
          licenseVerificationLink: '',
        },
      ],
    },
    ...overrides,
  };
}

describe('VendorSourcingService', () => {
  let service: VendorSourcingService;
  let mockBlueFolderService: jest.Mocked<BlueFolderService>;
  let mockSettings: jest.Mocked<OrganizationSettingsService>;
  let mockNominatim: jest.Mocked<NominatimProvider>;
  let mockGooglePlaces: jest.Mocked<GooglePlacesProvider>;
  let mockBuildZoom: jest.Mocked<BuildZoomProvider>;
  let mockQueryGenerator: jest.Mocked<SearchQueryGeneratorService>;
  let mockScoring: VendorScoringService;
  let mockTradeCategories: jest.Mocked<TradeCategoriesService>;
  let mockEmailEnrichment: jest.Mocked<EmailEnrichmentService>;
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
        makeGooglePlace(),
        makeGooglePlace({
          sourceId: 'ChIJ_test2',
          name: 'Quick Fix',
          phone: '+1 512-555-0002',
          address: '200 Oak Ave, Austin, TX',
          streetAddress: '200 Oak Ave',
          postalCode: '78702',
          latitude: 30.28,
          longitude: -97.75,
          website: null,
          rating: 4.2,
          reviewCount: 50,
          types: ['plumber', 'establishment'],
          businessHours: null,
        }),
      ]),
    } as unknown as jest.Mocked<GooglePlacesProvider>;

    mockBuildZoom = {
      name: 'buildzoom',
      isEnabled: true,
      search: jest.fn().mockResolvedValue([makeBzPlace()]),
      discoverProfileUrls: jest.fn().mockResolvedValue([
        'https://www.buildzoom.com/contractor/bz-plumbing',
        'https://www.buildzoom.com/contractor/bz-plumbing-2',
        'https://www.buildzoom.com/contractor/bz-plumbing-3',
        'https://www.buildzoom.com/contractor/bz-plumbing-4',
        'https://www.buildzoom.com/contractor/bz-plumbing-5',
        'https://www.buildzoom.com/contractor/bz-plumbing-6',
      ]),
      scrapeProfiles: jest.fn().mockResolvedValue([makeBzPlace()]),
    } as unknown as jest.Mocked<BuildZoomProvider>;

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

    mockEmailEnrichment = {
      enrichPlaces: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailEnrichmentService>;

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
        { provide: BuildZoomProvider, useValue: mockBuildZoom },
        { provide: SearchQueryGeneratorService, useValue: mockQueryGenerator },
        { provide: VendorScoringService, useValue: mockScoring },
        { provide: TradeCategoriesService, useValue: mockTradeCategories },
        { provide: EmailEnrichmentService, useValue: mockEmailEnrichment },
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
      expect(result.hasMore).toBe(true);
      expect(mockEmailEnrichment.enrichPlaces).toHaveBeenCalledTimes(1);
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

  describe('parallel search (Google + BuildZoom)', () => {
    it('should call both providers in parallel', async () => {
      await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(mockGooglePlaces.search).toHaveBeenCalled();
      expect(mockBuildZoom.discoverProfileUrls).toHaveBeenCalled();
      expect(mockBuildZoom.scrapeProfiles).toHaveBeenCalled();
    });

    it('should geocode BuildZoom results lacking coordinates', async () => {
      await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      // First call: address geocoding, Second+: BZ result geocoding
      const geocodeCalls = mockNominatim.geocode.mock.calls;
      const bzGeocode = geocodeCalls.find((c) =>
        c[0]?.includes('300 Elm St'),
      );
      expect(bzGeocode).toBeDefined();
    });

    it('should deduplicate across sources by phone', async () => {
      // BZ returns same phone as Google result — should be skipped
      mockBuildZoom.scrapeProfiles.mockResolvedValue([
        makeBzPlace({ phone: '+1 512-555-0001' }), // same as Google's Best Plumber
      ]);

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      // BZ vendor should be deduped out since phone matches Google result
      // Only Google results should remain (2 vendors)
      expect(result.status).toBe('completed');
      const names = result.candidates.map((c) => c.name);
      expect(names).not.toContain('BZ Plumbing');
    });

    it('should continue with Google-only when BuildZoom fails', async () => {
      mockBuildZoom.discoverProfileUrls.mockRejectedValue(new Error('BZ timeout'));

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(result.status).toBe('completed');
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it('should continue with Google-only when BuildZoom is disabled', async () => {
      mockBuildZoom.isEnabled = false;

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(result.status).toBe('completed');
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it('should include credential scores in candidate response', async () => {
      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      for (const c of result.candidates) {
        expect(c.scores.credential).toBeDefined();
        expect(typeof c.scores.credential).toBe('number');
      }
    });

    it('should return hasMore: true when pending URLs exist', async () => {
      mockBuildZoom.discoverProfileUrls.mockResolvedValue([
        'https://www.buildzoom.com/contractor/bz-1',
        'https://www.buildzoom.com/contractor/bz-2',
        'https://www.buildzoom.com/contractor/bz-3',
        'https://www.buildzoom.com/contractor/bz-4',
        'https://www.buildzoom.com/contractor/bz-5',
        'https://www.buildzoom.com/contractor/bz-6',
        'https://www.buildzoom.com/contractor/bz-7',
      ]);

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(result.hasMore).toBe(true);
    });

    it('should return hasMore: false when no pending URLs', async () => {
      mockBuildZoom.discoverProfileUrls.mockResolvedValue([
        'https://www.buildzoom.com/contractor/bz-1',
        'https://www.buildzoom.com/contractor/bz-2',
      ]);

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(result.hasMore).toBe(false);
    });

    it('should return hasMore: false on failed search', async () => {
      mockNominatim.geocode.mockResolvedValue(null);

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      expect(result.hasMore).toBe(false);
    });

    it('should deduplicate vendors with the same phone across providers', async () => {
      // Google returns two places from different queries with the same phone
      const place1 = makeGooglePlace({
        sourceId: 'ChIJ_dup1',
        name: 'Plumber A (listing 1)',
        phone: '+1 512-555-7777',
      });
      const place2 = makeGooglePlace({
        sourceId: 'ChIJ_dup2',
        name: 'Plumber A (listing 2)',
        phone: '+1 512-555-7777', // same phone
      });

      mockGooglePlaces.search.mockResolvedValue([place1, place2]);
      mockBuildZoom.discoverProfileUrls.mockResolvedValue([]);
      mockBuildZoom.scrapeProfiles.mockResolvedValue([]);

      // Mock chain: SR lookup → phone match (place1) → vendor update (place1)
      //   → phone match (place2) → vendor update (place2) → session update
      mockDb.where
        .mockResolvedValueOnce([{ id: 'sr-uuid' }]) // SR lookup
        .mockResolvedValueOnce([{ id: 'same-vendor-id' }]) // phone match for place1
        .mockResolvedValueOnce(undefined) // vendor update for place1
        .mockResolvedValueOnce([{ id: 'same-vendor-id' }]) // phone match for place2
        .mockResolvedValueOnce(undefined) // vendor update for place2
        .mockResolvedValueOnce(undefined); // session update

      const result = await service.search(clerkOrgId, {
        serviceRequestBluefolderId: 2270,
      });

      // Should NOT crash with a unique constraint violation.
      // Only 1 candidate should be returned (deduped by vendorId).
      expect(result.status).toBe('completed');
      expect(result.candidates.length).toBe(1);
    });
  });

  describe('loadMore', () => {
    it('should return empty candidates when session has no pending URLs', async () => {
      mockDb.where.mockResolvedValueOnce([
        {
          id: 'session-uuid',
          organizationId: internalOrgId,
          pendingProfileUrls: null,
          resultCount: 5,
          searchLatitude: '30.2672',
          searchLongitude: '-97.7431',
          searchRadiusMeters: 40000,
        },
      ]);

      const result = await service.loadMore(clerkOrgId, 'session-uuid');

      expect(result.candidates).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.resultCount).toBe(5);
    });

    it('should return empty candidates when session not found', async () => {
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.loadMore(clerkOrgId, 'nonexistent');

      expect(result.candidates).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should scrape next batch of pending URLs', async () => {
      // The loadMore method chains many DB queries via mockDb.where
      // 1. Session lookup → session row
      // 2. Existing results → [] (no existing results)
      // 3. Vendor upsert lookup (phone dedup) → [] (no existing vendor)
      // 4. Insert vendor → returning → [{id: 'new-vendor'}]
      // 5. Insert vendor source record → onConflictDoNothing
      // 6. Max rank query → [{maxRank: 5}]
      // 7. Insert search results
      // 8. Update session → where
      mockDb.where
        .mockResolvedValueOnce([
          {
            id: 'session-uuid',
            organizationId: internalOrgId,
            pendingProfileUrls: [
              'https://www.buildzoom.com/contractor/bz-6',
              'https://www.buildzoom.com/contractor/bz-7',
            ],
            resultCount: 5,
            searchLatitude: '30.2672',
            searchLongitude: '-97.7431',
            searchRadiusMeters: 40000,
          },
        ])
        // Existing results query
        .mockResolvedValueOnce([])
        // Vendor phone lookup (upsert)
        .mockResolvedValueOnce([])
        // Max rank query
        .mockResolvedValueOnce([{ maxRank: 5 }])
        // Update session
        .mockResolvedValueOnce(undefined);

      // Insert vendor → returning new vendor
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-vendor-uuid' }]);

      mockBuildZoom.scrapeProfiles.mockResolvedValue([makeBzPlace()]);

      const result = await service.loadMore(clerkOrgId, 'session-uuid');

      expect(mockBuildZoom.scrapeProfiles).toHaveBeenCalledWith([
        'https://www.buildzoom.com/contractor/bz-6',
        'https://www.buildzoom.com/contractor/bz-7',
      ]);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.hasMore).toBe(false);
      expect(result.candidates[0].rank).toBe(6); // continues from max rank 5
    });
  });
});
