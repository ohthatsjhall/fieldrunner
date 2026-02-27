import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PlaceProvider,
  PlaceSearchParams,
  NormalizedPlace,
} from './provider.interface';
import type { GooglePlacesTextSearchResponse } from '../types/google-places-api.types';
import { mapGooglePlace } from '../mappers/google-places.mapper';

const PLACES_API_URL =
  'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.types',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.businessStatus',
  'places.googleMapsUri',
].join(',');

@Injectable()
export class GooglePlacesProvider implements PlaceProvider {
  readonly name = 'google_places';

  private readonly logger = new Logger(GooglePlacesProvider.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? '';
  }

  async search(params: PlaceSearchParams): Promise<NormalizedPlace[]> {
    const body = {
      textQuery: params.query,
      locationBias: {
        circle: {
          center: {
            latitude: params.latitude,
            longitude: params.longitude,
          },
          radius: params.radiusMeters,
        },
      },
      maxResultCount: 20,
    };

    try {
      const response = await fetch(PLACES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        this.logger.warn(
          `Google Places search failed: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const data: GooglePlacesTextSearchResponse = await response.json();
      return (data.places ?? []).map(mapGooglePlace);
    } catch (error) {
      this.logger.error('Google Places search error', error);
      return [];
    }
  }
}
