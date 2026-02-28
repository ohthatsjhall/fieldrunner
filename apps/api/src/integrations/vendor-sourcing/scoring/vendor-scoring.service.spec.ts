import { VendorScoringService } from './vendor-scoring.service';
import type {
  ScoringInput,
  ScoringWeights,
  CategoryMatchLevel,
  BusinessHoursStatus,
  CredentialSignals,
} from './scoring.types';
import { DEFAULT_WEIGHTS, EMPTY_CREDENTIALS } from './scoring.types';

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
      credentialSignals: EMPTY_CREDENTIALS,
      ...overrides,
    };
  }

  function makeCredentials(
    overrides: Partial<CredentialSignals> = {},
  ): CredentialSignals {
    return { ...EMPTY_CREDENTIALS, ...overrides };
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
      expect(result.credentialScore).toBeGreaterThanOrEqual(0);
      expect(result.credentialScore).toBeLessThanOrEqual(100);
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
      const result = service.score(
        makeInput({ rating: null, reviewCount: null }),
      );
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
      const levels: CategoryMatchLevel[] = [
        'exact',
        'related',
        'fuzzy',
        'none',
      ];
      const scores = levels.map(
        (level) =>
          service.score(makeInput({ categoryMatch: level }))
            .categoryMatchScore,
      );
      expect(scores[0]).toBeGreaterThan(scores[1]);
      expect(scores[1]).toBeGreaterThan(scores[2]);
      expect(scores[2]).toBeGreaterThan(scores[3]);
      expect(scores[3]).toBe(0);
    });

    it('should score business hours correctly', () => {
      const statuses: BusinessHoursStatus[] = [
        'open',
        'closing_soon',
        'unknown',
        'closed',
      ];
      const scores = statuses.map(
        (s) =>
          service.score(makeInput({ businessHoursStatus: s }))
            .businessHoursScore,
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
        credential: 0,
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
      expect(close.totalScore).toBeGreaterThan(far.totalScore + 20);
    });
  });

  describe('credentialScore', () => {
    it('should return 0 for empty credential signals', () => {
      const result = service.calcCredentialScore(EMPTY_CREDENTIALS);
      expect(result).toBe(0);
    });

    it('should score active license at 40', () => {
      const result = service.calcCredentialScore(
        makeCredentials({ hasActiveLicense: true }),
      );
      expect(result).toBeGreaterThanOrEqual(40);
    });

    it('should score 0 for expired/revoked license', () => {
      const result = service.calcCredentialScore(
        makeCredentials({ hasActiveLicense: false }),
      );
      expect(result).toBe(0);
    });

    it('should score multiple licenses (capped at 15)', () => {
      const two = service.calcCredentialScore(
        makeCredentials({ licenseCount: 2 }),
      );
      const five = service.calcCredentialScore(
        makeCredentials({ licenseCount: 5 }),
      );
      expect(two).toBe(10);
      expect(five).toBe(15); // capped at 3 * 5 = 15
    });

    it('should score bzScore on 0-200 scale', () => {
      const low = service.calcCredentialScore(
        makeCredentials({ bzScore: 50 }),
      );
      const high = service.calcCredentialScore(
        makeCredentials({ bzScore: 150 }),
      );
      const max = service.calcCredentialScore(
        makeCredentials({ bzScore: 200 }),
      );
      expect(high).toBeGreaterThan(low);
      expect(max).toBe(20); // 200/200 * 20 = 20
    });

    it('should score insurance at 10', () => {
      const result = service.calcCredentialScore(
        makeCredentials({ isInsured: true }),
      );
      expect(result).toBe(10);
    });

    it('should score recent permits on log scale', () => {
      const few = service.calcCredentialScore(
        makeCredentials({ recentPermitCount: 5 }),
      );
      const many = service.calcCredentialScore(
        makeCredentials({ recentPermitCount: 50 }),
      );
      expect(many).toBeGreaterThan(few);
      expect(many).toBeLessThanOrEqual(15);
    });

    it('should cap at 100', () => {
      const maxed = service.calcCredentialScore({
        hasActiveLicense: true,   // 40
        licenseCount: 5,          // 15
        bzScore: 200,             // 20
        isInsured: true,          // 10
        recentPermitCount: 50,    // ~15
        permitCount: 300,
      });
      expect(maxed).toBeLessThanOrEqual(100);
    });

    it('should weight credential at 0.20 in total score', () => {
      expect(DEFAULT_WEIGHTS.credential).toBe(0.20);
    });

    it('BZ vendor with strong credentials should outscore Google vendor with no credentials (comparable distance)', () => {
      // Google vendor: good rating, no credentials
      const googleVendor = service.score(makeInput({
        distanceMeters: 3200,
        rating: 4.8,
        reviewCount: 13,
        categoryMatch: 'exact',
        businessHoursStatus: 'open',
        credentialSignals: EMPTY_CREDENTIALS,
      }));

      // BZ vendor: no rating, strong credentials
      const bzVendor = service.score(makeInput({
        distanceMeters: 5800,
        rating: null,
        reviewCount: 3,
        categoryMatch: 'exact',
        businessHoursStatus: 'unknown',
        credentialSignals: {
          hasActiveLicense: true,
          licenseCount: 2,
          bzScore: 142,
          isInsured: true,
          permitCount: 85,
          recentPermitCount: 22,
        },
      }));

      expect(bzVendor.totalScore).toBeGreaterThan(googleVendor.totalScore);
      expect(bzVendor.credentialScore).toBeGreaterThan(70);
      expect(googleVendor.credentialScore).toBe(0);
    });
  });

  describe('scoreAndRank', () => {
    it('should rank vendors by totalScore descending', () => {
      const inputs = [
        {
          id: 'far',
          input: makeInput({
            distanceMeters: 35000,
            rating: 3.0,
            reviewCount: 2,
          }),
        },
        {
          id: 'close',
          input: makeInput({
            distanceMeters: 1000,
            rating: 4.8,
            reviewCount: 300,
          }),
        },
        {
          id: 'mid',
          input: makeInput({
            distanceMeters: 10000,
            rating: 4.0,
            reviewCount: 50,
          }),
        },
      ];

      const ranked = service.scoreAndRank(inputs);

      expect(ranked[0].id).toBe('close');
      expect(ranked[ranked.length - 1].id).toBe('far');
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
