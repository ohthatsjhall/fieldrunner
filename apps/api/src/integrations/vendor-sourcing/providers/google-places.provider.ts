import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PlaceProvider,
  PlaceSearchParams,
  NormalizedPlace,
} from './provider.interface';
import type { GooglePlacesTextSearchResponse } from '../types/google-places-api.types';
import { mapGooglePlace } from '../mappers/google-places.mapper';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

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

  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY is not configured. Vendor sourcing requires a valid Google Places API key.',
      );
    }
    this.apiKey = apiKey;
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
      throw new Error(
        `Google Places search failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: GooglePlacesTextSearchResponse = await response.json();
    return (data.places ?? []).map(mapGooglePlace);
  }
}
