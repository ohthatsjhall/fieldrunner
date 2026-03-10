import type { ContactStatus, ValidEmail } from './database.js';

export type ContactAttemptSummary = {
  id: string;
  status: ContactStatus;
  notes: string | null;
  attemptedAt: string;
};

export type VendorCandidate = {
  vendorId: string;
  vendorSearchResultId: string;
  rank: number;
  score: number;
  name: string;
  phone: string | null;
  phoneRaw: string | null;
  address: string | null;
  website: string | null;
  email: ValidEmail | null;
  rating: number | null;
  reviewCount: number | null;
  distanceMeters: number | null;
  categories: string[] | null;
  googlePlaceId: string | null;
  sources?: string[];
  scores: {
    distance: number | null;
    rating: number | null;
    reviewCount: number | null;
    categoryMatch: number | null;
    businessHours: number | null;
    credential: number | null;
  };
  contactAttempts: ContactAttemptSummary[];
  latestContactStatus: ContactStatus | null;
  contactAttemptCount: number;
};

export type VendorSearchStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type VendorSearchResponse = {
  sessionId: string;
  status: VendorSearchStatus;
  searchQuery: string;
  searchAddress: string;
  resultCount: number;
  durationMs: number | null;
  candidates: VendorCandidate[];
  hasMore: boolean;
};

export type VendorSearchRequest = {
  serviceRequestBluefolderId?: number;
  address?: string;
  tradeCategory?: string;
  radiusMeters?: number;
};
