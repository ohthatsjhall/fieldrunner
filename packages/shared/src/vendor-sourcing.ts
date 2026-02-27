export type VendorCandidate = {
  vendorId: string;
  rank: number;
  score: number;
  name: string;
  phone: string | null;
  phoneRaw: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  distanceMeters: number | null;
  categories: string[] | null;
  googlePlaceId: string | null;
  scores: {
    distance: number | null;
    rating: number | null;
    reviewCount: number | null;
    categoryMatch: number | null;
    businessHours: number | null;
  };
};

export type VendorSearchResponse = {
  sessionId: string;
  status: string;
  searchQuery: string;
  searchAddress: string;
  resultCount: number;
  durationMs: number | null;
  candidates: VendorCandidate[];
};

export type VendorSearchRequest = {
  serviceRequestBluefolderId?: number;
  address?: string;
  tradeCategory?: string;
  radiusMeters?: number;
};
