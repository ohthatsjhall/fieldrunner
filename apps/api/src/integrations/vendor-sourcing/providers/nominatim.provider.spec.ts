import { NominatimProvider } from './nominatim.provider';
import { ConfigService } from '@nestjs/config';
import type { NominatimSearchResult } from '../types/nominatim-api.types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NominatimProvider', () => {
  let provider: NominatimProvider;
  let mockConfig: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn().mockReturnValue('Fieldrunner/1.0'),
    } as unknown as jest.Mocked<ConfigService>;
    provider = new NominatimProvider(mockConfig);
    mockFetch.mockReset();
  });

  const mockResult: NominatimSearchResult = {
    place_id: 12345,
    licence: 'ODbL',
    osm_type: 'node',
    osm_id: 67890,
    lat: '30.2672',
    lon: '-97.7431',
    class: 'place',
    type: 'city',
    place_rank: 16,
    importance: 0.7,
    addresstype: 'city',
    name: 'Austin',
    display_name: 'Austin, Travis County, Texas, US',
    address: {
      city: 'Austin',
      state: 'Texas',
      postcode: '78701',
      country: 'United States',
      country_code: 'us',
    },
    boundingbox: ['30.1', '30.5', '-97.9', '-97.5'],
  };

  describe('geocode', () => {
    it('should geocode an address and return lat/lng', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockResult],
      });

      const result = await provider.geocode('123 Main St, Austin, TX 78701');

      expect(result).toEqual({
        latitude: 30.2672,
        longitude: -97.7431,
        displayName: 'Austin, Travis County, Texas, US',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('nominatim.openstreetmap.org');
      expect(url).toContain('format=json');
    });

    it('should return null when no results are found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await provider.geocode('nonexistent place xyz');
      expect(result).toBeNull();
    });

    it('should throw when fetch returns non-OK status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(provider.geocode('123 Main St')).rejects.toThrow(
        'Nominatim geocode failed: 500 Internal Server Error',
      );
    });

    it('should include User-Agent header from config', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockResult],
      });

      await provider.geocode('Austin, TX');

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.headers).toEqual(
        expect.objectContaining({ 'User-Agent': 'Fieldrunner/1.0' }),
      );
    });
  });
});
