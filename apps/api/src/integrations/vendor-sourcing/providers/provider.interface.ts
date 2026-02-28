export type PlaceSearchParams = {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
};

export type NormalizedPlace = {
  sourceId: string;
  source: string;
  name: string;
  phone: string | null;
  address: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  types: string[];
  businessHours: Record<string, unknown> | null;
  rawData: Record<string, unknown>;
};

export interface PlaceProvider {
  readonly name: string;
  search(params: PlaceSearchParams): Promise<NormalizedPlace[]>;
}
