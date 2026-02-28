import {
  BuildZoomProvider,
  buildSearchUrl,
  extractProfileUrls,
  parseMetadataDescription,
  mergeWithMetadata,
} from './buildzoom.provider';
import type { PlaceSearchParams } from './provider.interface';
import type { FirecrawlService } from '../../firecrawl/firecrawl.service';
import type { BuildZoomContractor } from '../types/buildzoom-api.types';

function makeFirecrawl(configured = true): jest.Mocked<FirecrawlService> {
  return {
    isConfigured: configured,
    scrape: jest.fn(),
    scrapeJson: jest.fn(),
    map: jest.fn(),
  } as unknown as jest.Mocked<FirecrawlService>;
}

function makeParams(
  overrides: Partial<PlaceSearchParams> = {},
): PlaceSearchParams {
  return {
    query: 'plumber',
    latitude: 40.4406,
    longitude: -79.9959,
    radiusMeters: 40000,
    locationName: 'Pittsburgh, PA',
    ...overrides,
  };
}

const sampleLinks = [
  'https://www.buildzoom.com/contractor/acme-plumbing',
  'https://www.buildzoom.com/contractor/acme-plumbing#reviews',
  'https://www.buildzoom.com/contractor/acme-plumbing#gallery',
  'https://www.buildzoom.com/contractor/best-pipes',
  'https://www.buildzoom.com/pittsburgh-pa/plumbers',
  'https://www.buildzoom.com/about',
  'https://www.buildzoom.com/contractor/best-pipes#permit_history',
];

const sampleContractorJson: BuildZoomContractor = {
  url: '',
  contractorName: 'Acme Plumbing',
  phoneNumber: '(412) 555-1234',
  location: 'Pittsburgh, PA',
  fullAddress: '123 Main St, Pittsburgh, PA 15201',
  bzScore: '120',
  numberOfProjects: 50,
  reviewsCount: 3,
  servicesOffered: ['Plumbing'],
  licenses: [],
};

describe('BuildZoomProvider', () => {
  it('should have name "buildzoom"', () => {
    const provider = new BuildZoomProvider(makeFirecrawl());
    expect(provider.name).toBe('buildzoom');
  });

  it('should return isEnabled = false when FirecrawlService not configured', () => {
    const provider = new BuildZoomProvider(makeFirecrawl(false));
    expect(provider.isEnabled).toBe(false);
  });

  it('should return isEnabled = true when FirecrawlService is configured', () => {
    const provider = new BuildZoomProvider(makeFirecrawl(true));
    expect(provider.isEnabled).toBe(true);
  });

  it('should return [] when disabled (does not call firecrawl)', async () => {
    const firecrawl = makeFirecrawl(false);
    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
    expect(firecrawl.scrape).not.toHaveBeenCalled();
  });

  it('should return [] when locationName is missing', async () => {
    const firecrawl = makeFirecrawl();
    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(
      makeParams({ locationName: undefined }),
    );
    expect(result).toEqual([]);
    expect(firecrawl.scrape).not.toHaveBeenCalled();
  });

  it('should call firecrawl.scrape() with correct search URL for links', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({ links: [] });

    const provider = new BuildZoomProvider(firecrawl);
    await provider.search(makeParams());

    expect(firecrawl.scrape).toHaveBeenCalledWith(
      'https://www.buildzoom.com/pittsburgh-pa/plumbers',
      { formats: ['links'] },
    );
  });

  it('should return [] when search page scrape fails', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce(null);

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });

  it('should return [] when search page has no links', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({ links: [] });

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });

  it('should return [] when no contractor links found on page', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({
      links: [
        'https://www.buildzoom.com/about',
        'https://www.buildzoom.com/pittsburgh-pa/plumbers',
      ],
    });

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
    expect(firecrawl.scrapeJson).not.toHaveBeenCalled();
  });

  it('should call firecrawl.scrapeJson() for each profile URL', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({ links: sampleLinks });
    firecrawl.scrapeJson.mockResolvedValue({
      data: { ...sampleContractorJson },
      metadata: { description: '' },
    });

    const provider = new BuildZoomProvider(firecrawl);
    await provider.search(makeParams());

    // 2 unique contractor URLs after dedup
    expect(firecrawl.scrapeJson).toHaveBeenCalledTimes(2);
    expect(firecrawl.scrapeJson).toHaveBeenCalledWith(
      'https://www.buildzoom.com/contractor/acme-plumbing',
      expect.any(Object),
      expect.any(String),
      expect.objectContaining({ waitFor: 2000 }),
    );
  });

  it('should map results through mapBuildZoomContractor', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({
      links: ['https://www.buildzoom.com/contractor/acme-plumbing'],
    });
    firecrawl.scrapeJson.mockResolvedValueOnce({
      data: { ...sampleContractorJson },
      metadata: { description: '' },
    });

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('buildzoom');
    expect(result[0].name).toBe('Acme Plumbing');
    expect(result[0].phone).toBe('(412) 555-1234');
  });

  it('should return partial results when some profile scrapes fail', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({ links: sampleLinks });
    firecrawl.scrapeJson
      .mockResolvedValueOnce({
        data: { ...sampleContractorJson },
        metadata: { description: '' },
      })
      .mockResolvedValueOnce(null);

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Acme Plumbing');
  });

  it('should limit profile scraping to MAX_PROFILES', async () => {
    const firecrawl = makeFirecrawl();
    const manyLinks = Array.from(
      { length: 15 },
      (_, i) => `https://www.buildzoom.com/contractor/contractor-${i}`,
    );
    firecrawl.scrape.mockResolvedValueOnce({ links: manyLinks });
    firecrawl.scrapeJson.mockResolvedValue({
      data: { ...sampleContractorJson },
      metadata: { description: '' },
    });

    const provider = new BuildZoomProvider(firecrawl);
    await provider.search(makeParams());

    expect(firecrawl.scrapeJson).toHaveBeenCalledTimes(10);
  });

  it('should set url on contractor from the scraped profile URL', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({
      links: ['https://www.buildzoom.com/contractor/acme-plumbing'],
    });
    firecrawl.scrapeJson.mockResolvedValueOnce({
      data: { contractorName: 'Acme', url: '' },
      metadata: { description: '' },
    });

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());

    expect(result[0].sourceId).toBe(
      'https://www.buildzoom.com/contractor/acme-plumbing',
    );
  });

  it('should merge metadata description into contractor data', async () => {
    const firecrawl = makeFirecrawl();
    firecrawl.scrape.mockResolvedValueOnce({
      links: ['https://www.buildzoom.com/contractor/acme-plumbing'],
    });
    firecrawl.scrapeJson.mockResolvedValueOnce({
      data: {
        contractorName: 'Acme Plumbing',
        url: '',
        licenses: [],
        totalPermittedProjects: 0,
      },
      metadata: {
        description:
          '10 building permits for $50,000. Plumbing License: PA127904',
      },
    });

    const provider = new BuildZoomProvider(firecrawl);
    const result = await provider.search(makeParams());

    // Should have metadata-derived license and permit data
    const raw = result[0].rawData as unknown as BuildZoomContractor;
    expect(raw.licenses).toHaveLength(1);
    expect(raw.licenses![0].licenseNumber).toBe('PA127904');
    expect(raw.totalPermittedProjects).toBe(10);
  });
});

// ── buildSearchUrl ──────────────────────────────────────────────────

describe('buildSearchUrl', () => {
  it('should slugify "Pittsburgh, PA" + "plumber" → correct URL', () => {
    const url = buildSearchUrl('Pittsburgh, PA', 'plumber');
    expect(url).toBe('https://www.buildzoom.com/pittsburgh-pa/plumbers');
  });

  it('should not double-pluralize already plural trades', () => {
    const url = buildSearchUrl('Pittsburgh, PA', 'plumbers');
    expect(url).toBe('https://www.buildzoom.com/pittsburgh-pa/plumbers');
  });

  it('should handle multi-word trades', () => {
    const url = buildSearchUrl('Los Angeles, CA', 'general contractor');
    expect(url).toBe(
      'https://www.buildzoom.com/los-angeles-ca/general-contractors',
    );
  });

  it('should not pluralize abstract trade names ending in -tion', () => {
    const url = buildSearchUrl('Blairs, VA', 'Commercial Refrigeration');
    expect(url).toBe(
      'https://www.buildzoom.com/blairs-va/commercial-refrigeration',
    );
  });

  it('should not pluralize trade names ending in -ing', () => {
    const url = buildSearchUrl('Pittsburgh, PA', 'plumbing');
    expect(url).toBe('https://www.buildzoom.com/pittsburgh-pa/plumbing');
  });
});

// ── extractProfileUrls ──────────────────────────────────────────────

describe('extractProfileUrls', () => {
  it('should filter links to only /contractor/ patterns', () => {
    const result = extractProfileUrls(sampleLinks);
    expect(result).toEqual([
      'https://www.buildzoom.com/contractor/acme-plumbing',
      'https://www.buildzoom.com/contractor/best-pipes',
    ]);
  });

  it('should strip fragment anchors and deduplicate', () => {
    const links = [
      'https://www.buildzoom.com/contractor/acme#reviews',
      'https://www.buildzoom.com/contractor/acme#gallery',
      'https://www.buildzoom.com/contractor/acme',
    ];
    const result = extractProfileUrls(links);
    expect(result).toEqual([
      'https://www.buildzoom.com/contractor/acme',
    ]);
  });

  it('should return [] when no contractor links exist', () => {
    const result = extractProfileUrls([
      'https://www.buildzoom.com/about',
      'https://www.buildzoom.com/contact',
    ]);
    expect(result).toEqual([]);
  });
});

// ── parseMetadataDescription ────────────────────────────────────────

describe('parseMetadataDescription', () => {
  it('should extract permit count from description', () => {
    const result = parseMetadataDescription(
      '485 building permits for $596,700. 1 review',
    );
    expect(result.totalPermittedProjects).toBe(485);
  });

  it('should extract permit value from description', () => {
    const result = parseMetadataDescription(
      '485 building permits for $596,700.',
    );
    expect(result.typicalPermitValue).toBe('$596,700');
  });

  it('should extract license numbers from description', () => {
    const result = parseMetadataDescription(
      '2 building permits. License: PA127904',
    );
    expect(result.licenses).toHaveLength(1);
    expect(result.licenses![0].licenseNumber).toBe('PA127904');
  });

  it('should extract multiple license numbers', () => {
    const result = parseMetadataDescription('License: 976019, 123456');
    expect(result.licenses).toHaveLength(2);
    expect(result.licenses![0].licenseNumber).toBe('976019');
    expect(result.licenses![1].licenseNumber).toBe('123456');
  });

  it('should extract review count from description', () => {
    const result = parseMetadataDescription(
      '1 review with an average rating of 5.0',
    );
    expect(result.reviewsCount).toBe(1);
  });

  it('should extract services from description', () => {
    const result = parseMetadataDescription(
      '2 building permits. Plumbing New Construction, Remodel, And Repair License: PA127904',
    );
    expect(result.servicesOffered).toEqual([
      'Plumbing New Construction',
      'Remodel',
      'And Repair',
    ]);
  });

  it('should return empty partial when description has no matching data', () => {
    const result = parseMetadataDescription('No useful info here');
    expect(result).toEqual({});
  });
});

// ── mergeWithMetadata ───────────────────────────────────────────────

describe('mergeWithMetadata', () => {
  it('should use JSON data when populated, metadata as fallback', () => {
    const json: BuildZoomContractor = {
      url: 'https://example.com',
      contractorName: 'Acme',
      licenses: [
        {
          licenseNumber: '123',
          licenseStatus: 'Active',
          licenseCity: 'LA',
          licenseType: 'General',
          licenseBusinessType: '',
          licenseVerificationDate: '',
          licenseVerificationLink: '',
        },
      ],
      totalPermittedProjects: 100,
    };
    const metadata: Partial<BuildZoomContractor> = {
      licenses: [
        {
          licenseNumber: '999',
          licenseStatus: 'Unknown',
          licenseCity: '',
          licenseType: '',
          licenseBusinessType: '',
          licenseVerificationDate: '',
          licenseVerificationLink: '',
        },
      ],
      totalPermittedProjects: 50,
    };

    const result = mergeWithMetadata(json, metadata);
    expect(result.licenses![0].licenseNumber).toBe('123');
    expect(result.totalPermittedProjects).toBe(100);
  });

  it('should fill licenses from metadata when JSON has empty array', () => {
    const json: BuildZoomContractor = {
      url: 'https://example.com',
      contractorName: 'Acme',
      licenses: [],
    };
    const metadata: Partial<BuildZoomContractor> = {
      licenses: [
        {
          licenseNumber: 'PA127904',
          licenseStatus: 'Unknown',
          licenseCity: '',
          licenseType: '',
          licenseBusinessType: '',
          licenseVerificationDate: '',
          licenseVerificationLink: '',
        },
      ],
    };

    const result = mergeWithMetadata(json, metadata);
    expect(result.licenses![0].licenseNumber).toBe('PA127904');
  });

  it('should fall back numberOfProjects → totalPermittedProjects', () => {
    const json: BuildZoomContractor = {
      url: 'https://example.com',
      contractorName: 'Acme',
      numberOfProjects: 50,
      totalPermittedProjects: 0,
    };

    const result = mergeWithMetadata(json, {});
    expect(result.totalPermittedProjects).toBe(50);
  });

  it('should fill services from metadata when JSON has empty array', () => {
    const json: BuildZoomContractor = {
      url: 'https://example.com',
      contractorName: 'Acme',
      servicesOffered: [],
    };
    const metadata: Partial<BuildZoomContractor> = {
      servicesOffered: ['Plumbing', 'Remodel'],
    };

    const result = mergeWithMetadata(json, metadata);
    expect(result.servicesOffered).toEqual(['Plumbing', 'Remodel']);
  });
});
