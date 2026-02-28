import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PlaceProvider,
  PlaceSearchParams,
  NormalizedPlace,
} from './provider.interface';
import type { BuildZoomContractor } from '../types/buildzoom-api.types';
import { mapBuildZoomContractor } from '../mappers/buildzoom.mapper';

const APIFY_ACTOR_URL =
  'https://api.apify.com/v2/acts/actums~buildzoom-scraper/run-sync-get-dataset-items';

const TIMEOUT_MS = 90_000;

@Injectable()
export class BuildZoomProvider implements PlaceProvider {
  readonly name = 'buildzoom';
  private readonly logger = new Logger(BuildZoomProvider.name);
  private readonly apiToken: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiToken = this.config.get<string>('APIFY_API_TOKEN') ?? null;
    if (!this.apiToken) {
      this.logger.warn('APIFY_API_TOKEN not configured. BuildZoom disabled.');
    }
  }

  get isEnabled(): boolean {
    return this.apiToken !== null;
  }

  async search(params: PlaceSearchParams): Promise<NormalizedPlace[]> {
    if (!this.apiToken) return [];

    const body = {
      searchTerm: params.query,
      locationQuery: params.locationName ?? `${params.latitude}, ${params.longitude}`,
      sortPermitsBy: 'Date',
      maxPages: 1,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      this.logger.log(
        `BuildZoom search: "${body.searchTerm}" in "${body.locationQuery}"`,
      );

      const response = await fetch(APIFY_ACTOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `BuildZoom search failed: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        this.logger.warn('BuildZoom response is not an array');
        return [];
      }

      const contractors = data as BuildZoomContractor[];
      this.logger.log(`BuildZoom returned ${contractors.length} contractors`);

      return contractors.map(mapBuildZoomContractor);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`BuildZoom search timed out after ${TIMEOUT_MS}ms`);
      } else {
        this.logger.error('BuildZoom search error', error);
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
