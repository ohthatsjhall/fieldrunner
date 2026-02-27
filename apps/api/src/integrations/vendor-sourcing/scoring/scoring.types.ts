export type ScoringWeights = {
  distance: number;
  rating: number;
  reviewCount: number;
  categoryMatch: number;
  businessHours: number;
};

export type CategoryMatchLevel = 'exact' | 'related' | 'fuzzy' | 'none';
export type BusinessHoursStatus = 'open' | 'closing_soon' | 'unknown' | 'closed';

export type ScoringInput = {
  distanceMeters: number | null;
  rating: number | null;
  reviewCount: number | null;
  categoryMatch: CategoryMatchLevel;
  businessHoursStatus: BusinessHoursStatus;
};

export type ScoredResult = {
  totalScore: number;
  distanceScore: number;
  ratingScore: number;
  reviewCountScore: number;
  categoryMatchScore: number;
  businessHoursScore: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.35,
  rating: 0.30,
  reviewCount: 0.15,
  categoryMatch: 0.15,
  businessHours: 0.05,
};
