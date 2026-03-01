import type { GooglePlace } from '../types/google-places-api.types';
import type { NormalizedPlace } from '../providers/provider.interface';

export function mapGooglePlace(place: GooglePlace): NormalizedPlace {
  const components = place.addressComponents ?? [];

  return {
    sourceId: place.id,
    source: 'google_places',
    name: place.displayName.text,
    phone: place.internationalPhoneNumber ?? null,
    address: place.formattedAddress,
    streetAddress: buildStreetAddress(components),
    city: findComponent(components, 'locality'),
    state: findComponent(components, 'administrative_area_level_1', 'short'),
    postalCode: findComponent(components, 'postal_code'),
    country: findComponent(components, 'country', 'short'),
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    website: place.websiteUri ?? null,
    email: null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    types: place.types,
    businessHours: place.regularOpeningHours
      ? (place.regularOpeningHours as unknown as Record<string, unknown>)
      : null,
    rawData: place as unknown as Record<string, unknown>,
  };
}

function findComponent(
  components: GooglePlace['addressComponents'],
  type: string,
  textType: 'long' | 'short' = 'short',
): string | null {
  if (!components) return null;
  const comp = components.find((c) => c.types.includes(type));
  if (!comp) return null;
  return textType === 'short' ? comp.shortText : comp.longText;
}

function buildStreetAddress(
  components: NonNullable<GooglePlace['addressComponents']>,
): string | null {
  const number = findComponent(components, 'street_number');
  const route = findComponent(components, 'route');
  if (!number && !route) return null;
  return [number, route].filter(Boolean).join(' ');
}
