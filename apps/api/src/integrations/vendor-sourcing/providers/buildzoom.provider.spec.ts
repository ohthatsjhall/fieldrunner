import { ConfigService } from '@nestjs/config';
import { BuildZoomProvider } from './buildzoom.provider';
import type { PlaceSearchParams } from './provider.interface';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeConfig(token: string | undefined): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'APIFY_API_TOKEN') return token;
      return undefined;
    }),
  } as unknown as ConfigService;
}

function makeParams(overrides: Partial<PlaceSearchParams> = {}): PlaceSearchParams {
  return {
    query: 'plumber',
    latitude: 40.4406,
    longitude: -79.9959,
    radiusMeters: 40000,
    ...overrides,
  };
}

const sampleContractors = [
  {
    url: 'https://www.buildzoom.com/contractor/acme-plumbing',
    contractorName: 'Acme Plumbing',
    phoneNumber: '(412) 555-1234',
    location: 'Pittsburgh, PA',
    fullAddress: '123 Main St, Pittsburgh, PA 15201',
    bzScore: '120',
    reviewsCount: 3,
    servicesOffered: ['Plumbing'],
    licenses: [],
    permits: [],
  },
  {
    url: 'https://www.buildzoom.com/contractor/best-pipes',
    contractorName: 'Best Pipes LLC',
    phoneNumber: '(412) 555-5678',
    location: 'Pittsburgh, PA',
    fullAddress: '456 Oak Ave, Pittsburgh, PA 15213',
    bzScore: '85',
    servicesOffered: ['Plumbing', 'Drain Cleaning'],
    licenses: [],
    permits: [],
  },
];

describe('BuildZoomProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should have name "buildzoom"', () => {
    const provider = new BuildZoomProvider(makeConfig('test-token'));
    expect(provider.name).toBe('buildzoom');
  });

  it('should not throw when APIFY_API_TOKEN is missing', () => {
    const provider = new BuildZoomProvider(makeConfig(undefined));
    expect(provider.isEnabled).toBe(false);
  });

  it('should return [] when disabled', async () => {
    const provider = new BuildZoomProvider(makeConfig(undefined));
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should call Apify URL with Bearer auth and correct input body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleContractors,
    });

    const provider = new BuildZoomProvider(makeConfig('my-token'));
    await provider.search(makeParams({ query: 'plumber' }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('buildzoom-scraper'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
        body: expect.stringContaining('"searchTerm":"plumber"'),
      }),
    );
  });

  it('should use locationName when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    await provider.search({
      ...makeParams(),
      locationName: 'Pittsburgh, PA',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationQuery).toBe('Pittsburgh, PA');
  });

  it('should map response array through mapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleContractors,
    });

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    const result = await provider.search(makeParams());

    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('buildzoom');
    expect(result[0].name).toBe('Acme Plumbing');
    expect(result[1].name).toBe('Best Pipes LLC');
  });

  it('should return [] on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' });

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });

  it('should return [] on timeout (AbortError)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });

  it('should return [] on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });

  it('should return [] when response is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'unexpected' }),
    });

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });

  it('should handle empty dataset response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new BuildZoomProvider(makeConfig('test-token'));
    const result = await provider.search(makeParams());
    expect(result).toEqual([]);
  });
});
