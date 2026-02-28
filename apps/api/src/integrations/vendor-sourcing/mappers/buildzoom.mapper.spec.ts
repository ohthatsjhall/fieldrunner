import { mapBuildZoomContractor, parseLocation } from './buildzoom.mapper';
import type { BuildZoomContractor } from '../types/buildzoom-api.types';

function makeContractor(
  overrides: Partial<BuildZoomContractor> = {},
): BuildZoomContractor {
  return {
    url: 'https://www.buildzoom.com/contractor/acme-plumbing',
    contractorName: 'Acme Plumbing Inc',
    description: 'Full-service plumbing',
    location: 'Pittsburgh, PA',
    phoneNumber: '(412) 555-1234',
    fullAddress: '123 Main St, Pittsburgh, PA 15201',
    bzScore: '150',
    numberOfProjects: 200,
    totalPermittedProjects: 180,
    totalProjectsLastXYears: 45,
    totalProjectsYears: 3,
    typicalPermitValue: '$15,000',
    insurer: 'State Farm',
    insuredAmount: '$1,000,000',
    reviewsCount: 5,
    licenses: [
      {
        licenseNumber: 'PA-12345',
        licenseStatus: 'Active',
        licenseCity: 'Pittsburgh',
        licenseType: 'Plumber',
        licenseBusinessType: 'Corporation',
        licenseVerificationDate: 'October 2025',
        licenseVerificationLink: 'https://example.com/verify',
      },
    ],
    employees: [{ name: 'John Doe', title: 'Owner' }],
    servicesOffered: ['Plumbing', 'Drain Cleaning', 'Water Heater'],
    permits: [],
    ...overrides,
  };
}

describe('mapBuildZoomContractor', () => {
  it('should map a full contractor to NormalizedPlace', () => {
    const result = mapBuildZoomContractor(makeContractor());

    expect(result.source).toBe('buildzoom');
    expect(result.name).toBe('Acme Plumbing Inc');
    expect(result.phone).toBe('(412) 555-1234');
    expect(result.address).toBe('123 Main St, Pittsburgh, PA 15201');
    expect(result.city).toBe('Pittsburgh');
    expect(result.state).toBe('PA');
    expect(result.country).toBe('US');
    expect(result.types).toEqual(['Plumbing', 'Drain Cleaning', 'Water Heater']);
  });

  it('should use url as sourceId', () => {
    const result = mapBuildZoomContractor(makeContractor());
    expect(result.sourceId).toBe(
      'https://www.buildzoom.com/contractor/acme-plumbing',
    );
  });

  it('should fallback sourceId to bz-{contractorName} when URL missing', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ url: '' }),
    );
    expect(result.sourceId).toBe('bz-Acme Plumbing Inc');
  });

  it('should map phoneNumber to phone (preserved for downstream normalization)', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ phoneNumber: '(412) 555-1234' }),
    );
    expect(result.phone).toBe('(412) 555-1234');
  });

  it('should map fullAddress to address, fallback to location', () => {
    const withFull = mapBuildZoomContractor(makeContractor());
    expect(withFull.address).toBe('123 Main St, Pittsburgh, PA 15201');

    const noFull = mapBuildZoomContractor(
      makeContractor({ fullAddress: null }),
    );
    expect(noFull.address).toBe('Pittsburgh, PA');
  });

  it('should parse location "City, ST" into city and state', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ location: 'Dallas, TX' }),
    );
    expect(result.city).toBe('Dallas');
    expect(result.state).toBe('TX');
  });

  it('should NOT map bzScore to rating', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ bzScore: '150' }),
    );
    expect(result.rating).toBeNull();
  });

  it('should map reviewsCount to reviewCount', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ reviewsCount: 12 }),
    );
    expect(result.reviewCount).toBe(12);
  });

  it('should NOT map totalPermittedProjects to reviewCount', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ totalPermittedProjects: 300, reviewsCount: null }),
    );
    expect(result.reviewCount).toBeNull();
  });

  it('should map servicesOffered to types', () => {
    const result = mapBuildZoomContractor(
      makeContractor({ servicesOffered: ['HVAC', 'Plumbing'] }),
    );
    expect(result.types).toEqual(['HVAC', 'Plumbing']);
  });

  it('should set latitude and longitude to null', () => {
    const result = mapBuildZoomContractor(makeContractor());
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it('should set country to US always', () => {
    const result = mapBuildZoomContractor(makeContractor());
    expect(result.country).toBe('US');
  });

  it('should preserve full contractor in rawData', () => {
    const contractor = makeContractor();
    const result = mapBuildZoomContractor(contractor);
    expect(result.rawData).toEqual(contractor);
  });

  it('should handle missing optional fields gracefully', () => {
    const minimal = mapBuildZoomContractor({
      url: 'https://buildzoom.com/contractor/test',
      contractorName: 'Test Co',
    });

    expect(minimal.name).toBe('Test Co');
    expect(minimal.phone).toBeNull();
    expect(minimal.address).toBeNull();
    expect(minimal.city).toBeNull();
    expect(minimal.state).toBeNull();
    expect(minimal.rating).toBeNull();
    expect(minimal.reviewCount).toBeNull();
    expect(minimal.types).toEqual([]);
    expect(minimal.businessHours).toBeNull();
    expect(minimal.website).toBeNull();
  });
});

describe('parseLocation', () => {
  it('should parse "City, ST" format', () => {
    expect(parseLocation('Pittsburgh, PA')).toEqual({
      city: 'Pittsburgh',
      state: 'PA',
    });
  });

  it('should handle null/undefined', () => {
    expect(parseLocation(null)).toEqual({ city: null, state: null });
    expect(parseLocation(undefined)).toEqual({ city: null, state: null });
  });

  it('should handle city-only (no comma)', () => {
    expect(parseLocation('Pittsburgh')).toEqual({
      city: 'Pittsburgh',
      state: null,
    });
  });

  it('should handle empty string', () => {
    expect(parseLocation('')).toEqual({ city: null, state: null });
  });
});
