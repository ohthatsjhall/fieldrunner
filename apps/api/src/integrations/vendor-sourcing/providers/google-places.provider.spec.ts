import { GooglePlacesProvider } from './google-places.provider';
import { ConfigService } from '@nestjs/config';
import type { GooglePlacesTextSearchResponse } from '../types/google-places-api.types';
import type { PlaceSearchParams } from './provider.interface';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GooglePlacesProvider', () => {
  let provider: GooglePlacesProvider;
  let mockConfig: jest.Mocked<ConfigService>;

  const defaultParams: PlaceSearchParams = {
    query: 'plumber',
    latitude: 30.2672,
    longitude: -97.7431,
    radiusMeters: 40000,
  };

  beforeEach(() => {
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'GOOGLE_PLACES_API_KEY') return 'test-api-key';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;
    provider = new GooglePlacesProvider(mockConfig);
    mockFetch.mockReset();
  });

  const mockResponse: GooglePlacesTextSearchResponse = {
    places: [
      {
        id: 'ChIJ_test1',
        displayName: { text: 'Best Plumber', languageCode: 'en' },
        formattedAddress: '123 Main St, Austin, TX',
        location: { latitude: 30.27, longitude: -97.74 },
        rating: 4.8,
        userRatingCount: 200,
        internationalPhoneNumber: '+1 512-555-0001',
        types: ['plumber'],
      },
      {
        id: 'ChIJ_test2',
        displayName: { text: 'Quick Fix Plumbing', languageCode: 'en' },
        formattedAddress: '456 Oak Ave, Austin, TX',
        location: { latitude: 30.28, longitude: -97.75 },
        rating: 4.2,
        userRatingCount: 50,
        internationalPhoneNumber: '+1 512-555-0002',
        types: ['plumber', 'establishment'],
      },
    ],
  };

  describe('name', () => {
    it('should be google_places', () => {
      expect(provider.name).toBe('google_places');
    });
  });

  describe('search', () => {
    it('should call Google Places Text Search API and return normalized results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.search(defaultParams);

      expect(results).toHaveLength(2);
      expect(results[0].sourceId).toBe('ChIJ_test1');
      expect(results[0].name).toBe('Best Plumber');
      expect(results[0].source).toBe('google_places');
      expect(results[1].sourceId).toBe('ChIJ_test2');
    });

    it('should send correct headers including API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ places: [] }),
      });

      await provider.search(defaultParams);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('places.googleapis.com');
      expect(options.headers['X-Goog-Api-Key']).toBe('test-api-key');
      expect(options.headers['X-Goog-FieldMask']).toBeDefined();
    });

    it('should include location bias in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ places: [] }),
      });

      await provider.search(defaultParams);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.textQuery).toBe('plumber');
      expect(body.locationBias.circle.center.latitude).toBe(30.2672);
      expect(body.locationBias.circle.center.longitude).toBe(-97.7431);
      expect(body.locationBias.circle.radius).toBe(40000);
    });

    it('should return empty array on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const results = await provider.search(defaultParams);
      expect(results).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await provider.search(defaultParams);
      expect(results).toEqual([]);
    });

    it('should handle empty places array in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ places: [] }),
      });

      const results = await provider.search(defaultParams);
      expect(results).toEqual([]);
    });
  });
});
