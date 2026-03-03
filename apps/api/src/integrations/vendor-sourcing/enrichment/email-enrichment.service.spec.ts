import { Test, TestingModule } from '@nestjs/testing';
import { EmailEnrichmentService } from './email-enrichment.service';
import { FirecrawlService } from '../../firecrawl/firecrawl.service';
import type { NormalizedPlace } from '../providers/provider.interface';
import type { ValidEmail } from '@fieldrunner/shared';

function makePlace(overrides: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    sourceId: 'ChIJ_test',
    source: 'google_places',
    name: 'Acme Plumbing',
    phone: '+15551234567',
    address: '123 Main St',
    streetAddress: '123 Main St',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
    latitude: 30.27,
    longitude: -97.74,
    website: 'https://acmeplumbing.com',
    email: null,
    rating: 4.5,
    reviewCount: 100,
    types: ['plumber'],
    businessHours: null,
    rawData: {},
    ...overrides,
  };
}

describe('EmailEnrichmentService', () => {
  let service: EmailEnrichmentService;
  let mockFirecrawl: jest.Mocked<FirecrawlService>;

  beforeEach(async () => {
    mockFirecrawl = {
      isConfigured: true,
      scrapeJson: jest.fn(),
    } as unknown as jest.Mocked<FirecrawlService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailEnrichmentService,
        { provide: FirecrawlService, useValue: mockFirecrawl },
      ],
    }).compile();

    service = module.get(EmailEnrichmentService);
  });

  it('should enrich a place that has website but no email', async () => {
    mockFirecrawl.scrapeJson.mockResolvedValue({
      data: { email: 'contact@acmeplumbing.com' },
      metadata: {},
    });

    const places = [makePlace()];
    await service.enrichPlaces(places);

    expect(places[0].email).toBe('contact@acmeplumbing.com');
    expect(mockFirecrawl.scrapeJson).toHaveBeenCalledTimes(1);
    expect(mockFirecrawl.scrapeJson).toHaveBeenCalledWith(
      'https://acmeplumbing.com',
      expect.any(Object),
      expect.any(String),
      expect.objectContaining({ timeout: 15000 }),
    );
  });

  it('should skip places that already have an email', async () => {
    const places = [makePlace({ email: 'existing@acme.com' as ValidEmail })];
    await service.enrichPlaces(places);

    expect(mockFirecrawl.scrapeJson).not.toHaveBeenCalled();
    expect(places[0].email).toBe('existing@acme.com');
  });

  it('should skip places without a website', async () => {
    const places = [makePlace({ website: null })];
    await service.enrichPlaces(places);

    expect(mockFirecrawl.scrapeJson).not.toHaveBeenCalled();
    expect(places[0].email).toBeNull();
  });

  it('should handle scrape returning null gracefully', async () => {
    mockFirecrawl.scrapeJson.mockResolvedValue(null);

    const places = [makePlace()];
    await service.enrichPlaces(places);

    expect(places[0].email).toBeNull();
  });

  it('should handle scrape rejection gracefully', async () => {
    mockFirecrawl.scrapeJson.mockRejectedValue(new Error('timeout'));

    const places = [makePlace()];
    await service.enrichPlaces(places);

    expect(places[0].email).toBeNull();
  });

  it('should reject invalid email from scrape', async () => {
    mockFirecrawl.scrapeJson.mockResolvedValue({
      data: { email: 'not-valid' },
      metadata: {},
    });

    const places = [makePlace()];
    await service.enrichPlaces(places);

    expect(places[0].email).toBeNull();
  });

  it('should reject noreply email from scrape', async () => {
    mockFirecrawl.scrapeJson.mockResolvedValue({
      data: { email: 'noreply@acmeplumbing.com' },
      metadata: {},
    });

    const places = [makePlace()];
    await service.enrichPlaces(places);

    expect(places[0].email).toBeNull();
  });

  it('should enrich multiple places in parallel', async () => {
    mockFirecrawl.scrapeJson
      .mockResolvedValueOnce({
        data: { email: 'a@one.com' },
        metadata: {},
      })
      .mockResolvedValueOnce({
        data: { email: 'b@two.com' },
        metadata: {},
      });

    const places = [
      makePlace({ sourceId: '1', website: 'https://one.com' }),
      makePlace({ sourceId: '2', website: 'https://two.com' }),
    ];

    await service.enrichPlaces(places);

    expect(places[0].email).toBe('a@one.com');
    expect(places[1].email).toBe('b@two.com');
    expect(mockFirecrawl.scrapeJson).toHaveBeenCalledTimes(2);
  });

  it('should not mutate places that do not need enrichment in a mixed batch', async () => {
    mockFirecrawl.scrapeJson.mockResolvedValue({
      data: { email: 'found@site.com' },
      metadata: {},
    });

    const places = [
      makePlace({
        email: 'already@here.com' as ValidEmail,
        website: 'https://here.com',
      }),
      makePlace({ website: null }),
      makePlace({ sourceId: '3', website: 'https://needsemail.com' }),
    ];

    await service.enrichPlaces(places);

    expect(places[0].email).toBe('already@here.com');
    expect(places[1].email).toBeNull();
    expect(places[2].email).toBe('found@site.com');
    expect(mockFirecrawl.scrapeJson).toHaveBeenCalledTimes(1);
  });
});
