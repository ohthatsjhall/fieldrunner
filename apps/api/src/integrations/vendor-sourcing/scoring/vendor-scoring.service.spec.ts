import { VendorScoringService } from './vendor-scoring.service';
import type {
  ScoringInput,
  ScoringWeights,
  CategoryMatchLevel,
  BusinessHoursStatus,
} from './scoring.types';
import { DEFAULT_WEIGHTS } from './scoring.types';

describe('VendorScoringService', () => {
  let service: VendorScoringService;

  beforeEach(() => {
    service = new VendorScoringService();
  });

  function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
    return {
      distanceMeters: 5000,
      rating: 4.5,
      reviewCount: 50,
      categoryMatch: 'exact',
      businessHoursStatus: 'open',
      ...overrides,
    };
  }

  describe('score', () => {
    it('should return a totalScore between 0 and 100', () => {
      const result = service.score(makeInput());
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should return all component scores between 0 and 100', () => {
      const result = service.score(makeInput());
      expect(result.distanceScore).toBeGreaterThanOrEqual(0);
      expect(result.distanceScore).toBeLessThanOrEqual(100);
      expect(result.ratingScore).toBeGreaterThanOrEqual(0);
      expect(result.ratingScore).toBeLessThanOrEqual(100);
      expect(result.reviewCountScore).toBeGreaterThanOrEqual(0);
      expect(result.reviewCountScore).toBeLessThanOrEqual(100);
      expect(result.categoryMatchScore).toBeGreaterThanOrEqual(0);
      expect(result.categoryMatchScore).toBeLessThanOrEqual(100);
      expect(result.businessHoursScore).toBeGreaterThanOrEqual(0);
      expect(result.businessHoursScore).toBeLessThanOrEqual(100);
    });

    it('should score a very close vendor higher on distance than a far one', () => {
      const close = service.score(makeInput({ distanceMeters: 1000 }));
      const far = service.score(makeInput({ distanceMeters: 30000 }));
      expect(close.distanceScore).toBeGreaterThan(far.distanceScore);
    });

    it('should handle null distance gracefully (score 0)', () => {
      const result = service.score(makeInput({ distanceMeters: null }));
      expect(result.distanceScore).toBe(0);
    });

    it('should use Bayesian average for rating — 1 review at 5.0 should not beat 200 reviews at 4.5', () => {
      const fiveStarOneReview = service.score(
        makeInput({ rating: 5.0, reviewCount: 1 }),
      );
      const fourFiveStar200Reviews = service.score(
        makeInput({ rating: 4.5, reviewCount: 200 }),
      );
      expect(fourFiveStar200Reviews.ratingScore).toBeGreaterThan(
        fiveStarOneReview.ratingScore,
      );
    });

    it('should handle null rating (regress to prior mean)', () => {
      const result = service.score(makeInput({ rating: null, reviewCount: null }));
      expect(result.ratingScore).toBeGreaterThan(0);
    });

    it('should score review count on log scale', () => {
      const few = service.score(makeInput({ reviewCount: 5 }));
      const many = service.score(makeInput({ reviewCount: 200 }));
      const tons = service.score(makeInput({ reviewCount: 500 }));
      expect(many.reviewCountScore).toBeGreaterThan(few.reviewCountScore);
      expect(tons.reviewCountScore).toBeGreaterThanOrEqual(
        many.reviewCountScore,
      );
    });

    it('should handle null reviewCount (score 0)', () => {
      const result = service.score(makeInput({ reviewCount: null }));
      expect(result.reviewCountScore).toBe(0);
    });

    it('should score category match levels correctly', () => {
      const levels: CategoryMatchLevel[] = ['exact', 'related', 'fuzzy', 'none'];
      const scores = levels.map(
        (level) => service.score(makeInput({ categoryMatch: level })).categoryMatchScore,
      );
      // exact > related > fuzzy > none
      expect(scores[0]).toBeGreaterThan(scores[1]);
      expect(scores[1]).toBeGreaterThan(scores[2]);
      expect(scores[2]).toBeGreaterThan(scores[3]);
      expect(scores[3]).toBe(0);
    });

    it('should score business hours correctly', () => {
      const statuses: BusinessHoursStatus[] = ['open', 'closing_soon', 'unknown', 'closed'];
      const scores = statuses.map(
        (s) => service.score(makeInput({ businessHoursStatus: s })).businessHoursScore,
      );
      expect(scores[0]).toBeGreaterThan(scores[1]);
      expect(scores[1]).toBeGreaterThan(scores[2]);
      expect(scores[2]).toBeGreaterThan(scores[3]);
    });

    it('should accept custom weights', () => {
      const distanceOnlyWeights: ScoringWeights = {
        distance: 1.0,
        rating: 0,
        reviewCount: 0,
        categoryMatch: 0,
        businessHours: 0,
      };
      const close = service.score(
        makeInput({ distanceMeters: 100 }),
        40000,
        distanceOnlyWeights,
      );
      const far = service.score(
        makeInput({ distanceMeters: 39000 }),
        40000,
        distanceOnlyWeights,
      );
      // With only distance weighted, close should score much higher
      expect(close.totalScore).toBeGreaterThan(far.totalScore + 20);
    });
  });

  describe('scoreAndRank', () => {
    it('should rank vendors by totalScore descending', () => {
      const inputs = [
        { id: 'far', input: makeInput({ distanceMeters: 35000, rating: 3.0, reviewCount: 2 }) },
        { id: 'close', input: makeInput({ distanceMeters: 1000, rating: 4.8, reviewCount: 300 }) },
        { id: 'mid', input: makeInput({ distanceMeters: 10000, rating: 4.0, reviewCount: 50 }) },
      ];

      const ranked = service.scoreAndRank(inputs);

      expect(ranked[0].id).toBe('close');
      expect(ranked[ranked.length - 1].id).toBe('far');
      // Verify ranks are 1-based sequential
      expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    });

    it('should return empty array for empty input', () => {
      expect(service.scoreAndRank([])).toEqual([]);
    });

    it('should limit results when maxResults is provided', () => {
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        id: `v${i}`,
        input: makeInput({ distanceMeters: (i + 1) * 3000 }),
      }));

      const ranked = service.scoreAndRank(inputs, 40000, DEFAULT_WEIGHTS, 5);
      expect(ranked).toHaveLength(5);
    });
  });
});
