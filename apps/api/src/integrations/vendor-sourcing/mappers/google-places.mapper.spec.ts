import { mapGooglePlace } from './google-places.mapper';
import type { GooglePlace } from '../types/google-places-api.types';

function makeGooglePlace(overrides: Partial<GooglePlace> = {}): GooglePlace {
  return {
    id: 'ChIJtest123',
    displayName: { text: 'Test Plumbing Co', languageCode: 'en' },
    formattedAddress: '123 Main St, Austin, TX 78701, USA',
    addressComponents: [
      { longText: '123', shortText: '123', types: ['street_number'] },
      { longText: 'Main St', shortText: 'Main St', types: ['route'] },
      { longText: 'Austin', shortText: 'Austin', types: ['locality'] },
      {
        longText: 'Texas',
        shortText: 'TX',
        types: ['administrative_area_level_1'],
      },
      { longText: '78701', shortText: '78701', types: ['postal_code'] },
      {
        longText: 'United States',
        shortText: 'US',
        types: ['country'],
      },
    ],
    location: { latitude: 30.2672, longitude: -97.7431 },
    rating: 4.5,
    userRatingCount: 120,
    websiteUri: 'https://testplumbing.com',
    nationalPhoneNumber: '(555) 123-4567',
    internationalPhoneNumber: '+1 555-123-4567',
    types: ['plumber', 'establishment'],
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: ['Mon: 8 AM–5 PM'],
    },
    ...overrides,
  };
}

describe('mapGooglePlace', () => {
  it('should map a full Google Place to NormalizedPlace', () => {
    const result = mapGooglePlace(makeGooglePlace());

    expect(result.sourceId).toBe('ChIJtest123');
    expect(result.source).toBe('google_places');
    expect(result.name).toBe('Test Plumbing Co');
    expect(result.phone).toBe('+1 555-123-4567');
    expect(result.address).toBe('123 Main St, Austin, TX 78701, USA');
    expect(result.city).toBe('Austin');
    expect(result.state).toBe('TX');
    expect(result.postalCode).toBe('78701');
    expect(result.country).toBe('US');
    expect(result.latitude).toBe(30.2672);
    expect(result.longitude).toBe(-97.7431);
    expect(result.website).toBe('https://testplumbing.com');
    expect(result.email).toBeNull();
    expect(result.rating).toBe(4.5);
    expect(result.reviewCount).toBe(120);
    expect(result.types).toEqual(['plumber', 'establishment']);
  });

  it('should handle missing optional fields', () => {
    const minimal = makeGooglePlace({
      addressComponents: undefined,
      rating: undefined,
      userRatingCount: undefined,
      websiteUri: undefined,
      nationalPhoneNumber: undefined,
      internationalPhoneNumber: undefined,
      regularOpeningHours: undefined,
    });

    const result = mapGooglePlace(minimal);

    expect(result.phone).toBeNull();
    expect(result.rating).toBeNull();
    expect(result.reviewCount).toBeNull();
    expect(result.website).toBeNull();
    expect(result.businessHours).toBeNull();
    expect(result.streetAddress).toBeNull();
    expect(result.city).toBeNull();
  });

  it('should extract street address from components', () => {
    const result = mapGooglePlace(makeGooglePlace());
    expect(result.streetAddress).toBe('123 Main St');
  });

  it('should preserve raw data for audit', () => {
    const place = makeGooglePlace();
    const result = mapGooglePlace(place);
    expect(result.rawData).toEqual(place);
  });
});
