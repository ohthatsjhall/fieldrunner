import { Injectable } from '@nestjs/common';
import type {
  ScoringInput,
  ScoringWeights,
  ScoredResult,
  CategoryMatchLevel,
  BusinessHoursStatus,
  CredentialSignals,
} from './scoring.types';
import { DEFAULT_WEIGHTS } from './scoring.types';

/** Bayesian average constants */
const PRIOR_REVIEW_COUNT = 10; // C — confidence threshold
const PRIOR_MEAN_RATING = 3.5; // m — regress toward average

type RankedItem<T extends string> = {
  id: T;
  rank: number;
  scored: ScoredResult;
};

@Injectable()
export class VendorScoringService {
  /**
   * Score a single vendor candidate. Pure, stateless, no DB dependency.
   */
  score(
    input: ScoringInput,
    radiusMeters: number = 40000,
    weights: ScoringWeights = DEFAULT_WEIGHTS,
  ): ScoredResult {
    const distanceScore = this.calcDistanceScore(
      input.distanceMeters,
      radiusMeters,
    );
    const ratingScore = this.calcRatingScore(input.rating, input.reviewCount);
    const reviewCountScore = this.calcReviewCountScore(input.reviewCount);
    const categoryMatchScore = this.calcCategoryMatchScore(input.categoryMatch);
    const businessHoursScore = this.calcBusinessHoursScore(
      input.businessHoursStatus,
    );
    const credentialScore = this.calcCredentialScore(input.credentialSignals);

    const totalScore = this.clamp(
      weights.distance * distanceScore +
        weights.rating * ratingScore +
        weights.reviewCount * reviewCountScore +
        weights.categoryMatch * categoryMatchScore +
        weights.businessHours * businessHoursScore +
        weights.credential * credentialScore,
    );

    return {
      totalScore: this.round2(totalScore),
      distanceScore: this.round2(distanceScore),
      ratingScore: this.round2(ratingScore),
      reviewCountScore: this.round2(reviewCountScore),
      categoryMatchScore: this.round2(categoryMatchScore),
      businessHoursScore: this.round2(businessHoursScore),
      credentialScore: this.round2(credentialScore),
    };
  }

  /**
   * Score and rank a batch of vendors, returning them sorted by score descending.
   */
  scoreAndRank<T extends string>(
    items: { id: T; input: ScoringInput }[],
    radiusMeters: number = 40000,
    weights: ScoringWeights = DEFAULT_WEIGHTS,
    maxResults?: number,
  ): RankedItem<T>[] {
    const scored = items.map((item) => ({
      id: item.id,
      scored: this.score(item.input, radiusMeters, weights),
    }));

    scored.sort((a, b) => b.scored.totalScore - a.scored.totalScore);

    const limited = maxResults ? scored.slice(0, maxResults) : scored;

    return limited.map((item, i) => ({
      id: item.id,
      rank: i + 1,
      scored: item.scored,
    }));
  }

  /**
   * Exponential decay: 100 * exp(-distKm / (radiusKm/3))
   */
  private calcDistanceScore(
    distanceMeters: number | null,
    radiusMeters: number,
  ): number {
    if (distanceMeters === null || distanceMeters < 0) return 0;
    const distKm = distanceMeters / 1000;
    const radiusKm = radiusMeters / 1000;
    const decay = radiusKm / 3;
    return 100 * Math.exp(-distKm / decay);
  }

  /**
   * Bayesian average: (C*m + n*r) / (C+n) scaled to 0-100
   * where C=10 (prior review count), m=3.5 (prior mean rating)
   */
  private calcRatingScore(
    rating: number | null,
    reviewCount: number | null,
  ): number {
    const r = rating ?? PRIOR_MEAN_RATING;
    const n = reviewCount ?? 0;
    const bayesian =
      (PRIOR_REVIEW_COUNT * PRIOR_MEAN_RATING + n * r) /
      (PRIOR_REVIEW_COUNT + n);
    // Scale 0-5 rating to 0-100
    return (bayesian / 5) * 100;
  }

  /**
   * Log scale: min(100, log(1+n) / log(1+500) * 100)
   */
  private calcReviewCountScore(reviewCount: number | null): number {
    if (reviewCount === null || reviewCount <= 0) return 0;
    return Math.min(100, (Math.log(1 + reviewCount) / Math.log(1 + 500)) * 100);
  }

  /**
   * Category match: exact=100, related=50, fuzzy=20, none=0
   */
  private calcCategoryMatchScore(match: CategoryMatchLevel): number {
    const scores: Record<CategoryMatchLevel, number> = {
      exact: 100,
      related: 50,
      fuzzy: 20,
      none: 0,
    };
    return scores[match];
  }

  /**
   * Business hours: open=100, closing_soon=75, unknown=50, closed=25
   */
  private calcBusinessHoursScore(status: BusinessHoursStatus): number {
    const scores: Record<BusinessHoursStatus, number> = {
      open: 100,
      closing_soon: 75,
      unknown: 50,
      closed: 25,
    };
    return scores[status];
  }

  /**
   * Credential score from BuildZoom-style professional signals.
   * Returns 0-100 based on license status, BZ score, insurance, permits.
   */
  calcCredentialScore(signals: CredentialSignals): number {
    let score = 0;

    // Active license: strongest signal (40 points max)
    if (signals.hasActiveLicense === true) score += 40;

    // Multiple licenses: breadth indicator (15 points max)
    score += Math.min(15, signals.licenseCount * 5);

    // BuildZoom score: normalized to 0-20 (20 points max)
    if (signals.bzScore !== null) {
      score += Math.min(20, (signals.bzScore / 200) * 20);
    }

    // Insurance on file (10 points)
    if (signals.isInsured === true) score += 10;

    // Recent permit activity (15 points max, log scale)
    if (signals.recentPermitCount !== null && signals.recentPermitCount > 0) {
      score += Math.min(
        15,
        (Math.log(1 + signals.recentPermitCount) / Math.log(51)) * 15,
      );
    }

    return Math.min(100, score);
  }

  private clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
