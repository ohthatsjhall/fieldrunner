export type ScoringWeights = {
  distance: number;
  rating: number;
  reviewCount: number;
  categoryMatch: number;
  businessHours: number;
  credential: number;
};

export type CategoryMatchLevel = 'exact' | 'related' | 'fuzzy' | 'none';
export type BusinessHoursStatus =
  | 'open'
  | 'closing_soon'
  | 'unknown'
  | 'closed';

export type CredentialSignals = {
  hasActiveLicense: boolean | null;
  licenseCount: number;
  bzScore: number | null;
  isInsured: boolean | null;
  permitCount: number | null;
  recentPermitCount: number | null;
};

export const EMPTY_CREDENTIALS: CredentialSignals = {
  hasActiveLicense: null,
  licenseCount: 0,
  bzScore: null,
  isInsured: null,
  permitCount: null,
  recentPermitCount: null,
};

export type ScoringInput = {
  distanceMeters: number | null;
  rating: number | null;
  reviewCount: number | null;
  categoryMatch: CategoryMatchLevel;
  businessHoursStatus: BusinessHoursStatus;
  credentialSignals: CredentialSignals;
};

export type ScoredResult = {
  totalScore: number;
  distanceScore: number;
  ratingScore: number;
  reviewCountScore: number;
  categoryMatchScore: number;
  businessHoursScore: number;
  credentialScore: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.3,
  rating: 0.25,
  reviewCount: 0.1,
  categoryMatch: 0.1,
  businessHours: 0.05,
  credential: 0.2,
};
