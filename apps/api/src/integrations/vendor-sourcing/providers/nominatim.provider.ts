import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NominatimSearchResult,
  GeocodingResult,
} from '../types/nominatim-api.types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

@Injectable()
export class NominatimProvider {
  private readonly logger = new Logger(NominatimProvider.name);
  private readonly userAgent: string;

  constructor(private readonly config: ConfigService) {
    this.userAgent =
      this.config.get<string>('NOMINATIM_USER_AGENT') ?? 'Fieldrunner/1.0';
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '1',
    });

    const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!response.ok) {
        this.logger.warn(
          `Nominatim geocode failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const results: NominatimSearchResult[] = await response.json();

      if (!results.length) {
        return null;
      }

      const first = results[0];
      return {
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
        displayName: first.display_name,
      };
    } catch (error) {
      this.logger.error('Nominatim geocode error', error);
      return null;
    }
  }
}
