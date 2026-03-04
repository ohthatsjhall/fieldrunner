import type { BuildZoomContractor } from '../types/buildzoom-api.types';
import type { NormalizedPlace } from '../providers/provider.interface';
import { normalizeEmail } from './email.util';

export function mapBuildZoomContractor(
  contractor: BuildZoomContractor,
): NormalizedPlace {
  const { city, state } = parseLocation(contractor.location);

  return {
    sourceId: contractor.url || `bz-${contractor.contractorName}`,
    source: 'buildzoom',
    name: contractor.contractorName,
    phone: contractor.phoneNumber ?? null,
    address: contractor.fullAddress ?? contractor.location ?? null,
    streetAddress: null,
    city,
    state,
    postalCode: null,
    country: 'US',
    latitude: null,
    longitude: null,
    website: null,
    email: normalizeEmail(contractor.email),
    rating: null,
    reviewCount: contractor.reviewsCount ?? null,
    types: contractor.servicesOffered ?? [],
    businessHours: null,
    rawData: contractor as unknown as Record<string, unknown>,
  };
}

export function parseLocation(location: string | null | undefined): {
  city: string | null;
  state: string | null;
} {
  if (!location) return { city: null, state: null };
  const parts = location.split(',').map((s) => s.trim());
  return {
    city: parts[0] || null,
    state: parts[1] || null,
  };
}
