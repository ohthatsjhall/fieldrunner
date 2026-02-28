# PRD: BuildZoom Integration for Vendor Sourcing

**Author:** Auto-generated
**Date:** 2026-02-27
**Status:** Draft — pending BuildZoom trial run for output schema confirmation
**Branch:** `dev`

---

## 1. Overview

### Problem Statement

Fieldrunner's vendor sourcing feature relies exclusively on Google Places to find local contractors for service requests. Google Places provides broad business listing coverage but lacks construction-industry signals — it carries no license verification data, no permit history, no insurance or bond information, and no quality metrics specific to contractors. A plumbing company is represented with the same data model as a restaurant.

### Proposed Solution

Add BuildZoom as a second vendor data source, accessed via an Apify web scraper actor (`actums/buildzoom-scraper`). BuildZoom aggregates public records on licensed contractors — including permit history, license status, insurance, bonds, and a proprietary quality score — providing construction-specific depth that Google Places cannot offer.

### Key Outcome

Multi-source vendor search that combines Google Places' breadth of business listings with BuildZoom's construction-specific depth, running both sources in parallel and merging results into a single, deduplicated set of vendor candidates for dispatchers.

---

## 2. Goals & Non-Goals

### Goals

- **Add BuildZoom as a second data source** alongside Google Places within the existing vendor sourcing architecture.
- **Run both sources in parallel** for every vendor search to minimize latency impact.
- **Merge and deduplicate results** by phone number, combining data from both sources into unified vendor records.
- **Degrade gracefully** — if BuildZoom is unavailable, slow, or returns an error, Google Places results are returned as normal with no disruption to the dispatcher workflow.
- **Store source provenance** in the existing `vendor_source_records` table so that each vendor record tracks which source(s) contributed its data.

### Non-Goals (Explicitly Out of Scope)

- **Replacing Google Places.** BuildZoom supplements Google Places; it does not replace it. Google remains the primary source for broad coverage.
- **Adding a UI for selecting data sources.** Dispatchers will not choose which sources to query. Both sources run on every search automatically.
- **BuildZoom-specific scoring enhancements.** Phase 1 uses only fields compatible with the existing Google-based scoring model. Scoring adjustments that leverage BuildZoom-specific signals (license status, BZ quality score, permit volume) are deferred to Phase 2.
- **Bulk or batch vendor data imports from BuildZoom.** This integration is search-time only — vendors are sourced on demand per service request, not pre-loaded.
- **Direct BuildZoom API integration.** BuildZoom does not offer a public API. Data access is via the Apify scraper actor, and no effort will be spent on reverse-engineering or negotiating direct API access.

---

## 3. Technical Design

### 3.1 New Files

| # | Path | Responsibility |
|---|------|----------------|
| 1 | `apps/api/src/integrations/vendor-sourcing/providers/buildzoom.provider.ts` | NestJS Injectable that calls the Apify `actums/buildzoom-scraper` actor synchronously and returns raw API responses. |
| 2 | `apps/api/src/integrations/vendor-sourcing/types/buildzoom-api.types.ts` | TypeScript interfaces for the Apify actor input and the BuildZoom contractor response objects. |
| 3 | `apps/api/src/integrations/vendor-sourcing/mappers/buildzoom.mapper.ts` | Pure function `mapBuildZoomContractor()` that converts a `BuildZoomContractor` into the existing `NormalizedPlace` type. |
| 4 | `apps/api/src/integrations/vendor-sourcing/mappers/buildzoom.mapper.spec.ts` | Unit tests for the BuildZoom mapper. |
| 5 | `apps/api/src/integrations/vendor-sourcing/providers/buildzoom.provider.spec.ts` | Unit tests for the BuildZoom provider. |

### 3.2 Modified Files

| # | Path | Changes Required |
|---|------|------------------|
| 1 | `apps/api/src/integrations/vendor-sourcing/vendor-sourcing.service.ts` | Inject `BuildZoomProvider`. Refactor search to run Google Places and BuildZoom in parallel via `Promise.allSettled`. Add geocoding pass for BuildZoom results. Merge both result sets with cross-source phone deduplication. Update `sourceCounts` to include `buildzoom:*` keys. |
| 2 | `apps/api/src/integrations/vendor-sourcing/vendor-sourcing.module.ts` | Add `BuildZoomProvider` to the `providers` array. |
| 3 | `apps/api/src/config/env.validation.ts` | Add `APIFY_API_TOKEN` as an optional env var. |
| 4 | `apps/api/src/integrations/vendor-sourcing/providers/provider.interface.ts` | Add optional `locationName` field to `PlaceSearchParams`. |
| 5 | `apps/api/src/integrations/vendor-sourcing/scoring/scoring.types.ts` | Add `CredentialSignals` type, `credentialScore` to `ScoredResult`, `credential` weight to `ScoringWeights`, update `ScoringInput` with `credentialSignals` field. |
| 6 | `apps/api/src/integrations/vendor-sourcing/scoring/vendor-scoring.service.ts` | Add `calcCredentialScore()` method. Update `score()` to include credential component. |
| 7 | `apps/api/src/integrations/vendor-sourcing/scoring/vendor-scoring.service.spec.ts` | Add credential scoring tests (see Section 5.3). |
| 8 | `apps/api/src/integrations/vendor-sourcing/vendor-sourcing.service.spec.ts` | Add `mockBuildZoom` provider. Add test cases for parallel execution, graceful degradation, cross-source dedup, and geocoding. |
| 9 | `packages/shared/src/vendor-sourcing.ts` | Add optional `sources?: string[]` and `credentialScore?: number` fields to `VendorCandidate`. |

### 3.3 BuildZoom Provider

**Apify endpoint (synchronous, returns dataset items directly):**

```
POST https://api.apify.com/v2/acts/actums~buildzoom-scraper/run-sync-get-dataset-items?token={APIFY_API_TOKEN}
Content-Type: application/json

{
  "searchTerm": "asphalt paving contractor",
  "locationQuery": "Pittsburgh, PA",
  "sortPermitsBy": "Date",
  "maxPages": 1
}
```

**Provider class structure:**

```typescript
@Injectable()
export class BuildZoomProvider implements PlaceProvider {
  readonly name = 'buildzoom';
  private readonly logger = new Logger(BuildZoomProvider.name);
  private readonly apiToken: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiToken = this.config.get<string>('APIFY_API_TOKEN') ?? null;
    if (!this.apiToken) {
      this.logger.warn('APIFY_API_TOKEN not configured. BuildZoom disabled.');
    }
  }

  get isEnabled(): boolean {
    return this.apiToken !== null;
  }

  async search(params: PlaceSearchParams): Promise<NormalizedPlace[]> { ... }
}
```

**Key design decisions:**

- **Soft-fail constructor**: Unlike `GooglePlacesProvider` which throws if the API key is missing, `BuildZoomProvider` logs a warning and sets `isEnabled = false`. This keeps the app bootable without Apify credentials.
- **AbortController timeout (90s)**: Covers the expected 30-60s Apify latency plus buffer. Uses `AbortController` natively available in Bun.
- **No `apify-client` dependency**: Plain `fetch()` to the REST endpoint. Avoids adding a package for a single HTTP call.
- **Return type**: `NormalizedPlace[]` matching the existing provider interface. `latitude`/`longitude` will be `null` — the service layer handles geocoding.

### 3.4 BuildZoom Types

Based on the official Apify actor documentation and output example:

```typescript
/** Input payload for the actums/buildzoom-scraper Apify actor */
export type BuildZoomActorInput = {
  searchTerm: string;          // e.g. "plumber", "electrical contractor"
  locationQuery: string;       // e.g. "Dallas, TX"
  sortPermitsBy?: string;      // "effective_date" | "job_value" | "score"
  maxPages?: number;           // Pages of search results to crawl (0 = unlimited)
  maxRequestsPerCrawl?: number; // Total request cap (0 = unlimited)
};

/** License object nested inside a contractor result */
export type BuildZoomLicense = {
  licenseNumber: string;
  licenseStatus: string;          // "Active", "Expired", etc.
  licenseCity: string;
  licenseType: string;            // "General Contractor", "Plumber", etc.
  licenseBusinessType: string;    // "Corporation", "Sole Proprietor", etc.
  licenseVerificationDate: string; // "October 2025"
  licenseVerificationLink: string;
};

/** Permit object nested inside a contractor result (up to 300 per contractor) */
export type BuildZoomPermit = {
  header: string;
  address: string;
  date: string;                   // "2025-01-15"
  description: string;
  valuation: string;              // "$10,000"
  permitNumber: string;
  status: string;                 // "Issued", "Final", etc.
  fee: string;                    // "$150"
  permitType: string;             // "Residential", "Commercial"
  buildingType: string;           // "Single Family", "Commercial"
};

/** Employee object nested inside a contractor result */
export type BuildZoomEmployee = {
  name: string;
  title: string;
};

/**
 * A single contractor from the BuildZoom scraper dataset.
 * Field names match the actual Apify actor output schema.
 */
export type BuildZoomContractor = {
  url: string;                              // BZ profile URL (unique ID)
  contractorName: string;
  description?: string | null;
  location?: string | null;                 // "Dallas, TX"
  phoneNumber?: string | null;              // "(123) 456-7890"
  fullAddress?: string | null;
  bzScore?: string | null;                  // String, e.g. "150"

  // Project activity
  numberOfProjects?: number | null;
  totalPermittedProjects?: number | null;
  totalProjectsLastXYears?: number | null;
  totalProjectsYears?: number | null;       // How many years X covers
  typicalPermitValue?: string | null;       // "$10,000" format

  // Insurance
  insurer?: string | null;
  insuredAmount?: string | null;

  // Reviews
  reviewsCount?: number | null;

  // Nested arrays
  licenses?: BuildZoomLicense[];
  employees?: BuildZoomEmployee[];
  servicesOffered?: string[];
  permits?: BuildZoomPermit[];

  [key: string]: unknown;                   // Catch-all for unmapped fields
};
```

**Key differences from earlier assumptions:**

| Assumed | Actual |
|---|---|
| `name` | `contractorName` |
| `phone` | `phoneNumber` (formatted with parens/dashes) |
| `address` + `city` + `state` + `zip` | `fullAddress` (single string) + `location` ("City, ST") |
| `score` (number) | `bzScore` (string, e.g. "150") |
| `specialties: string[]` | `servicesOffered: string[]` |
| `licenseNumber` (flat) | `licenses[]` (array of license objects with status, type, city, etc.) |
| `permitCount` (number) | `totalPermittedProjects` (number) + full `permits[]` array |
| No reviews field | `reviewsCount` (number) — BZ does have actual reviews |

### 3.5 BuildZoom Mapper

**Field mapping table:**

| BuildZoom Field | NormalizedPlace Field | Notes |
|---|---|---|
| `url` | `sourceId` | BZ profile URL as unique ID. Fallback: `bz-{contractorName}`. |
| `'buildzoom'` | `source` | Hardcoded literal. |
| `contractorName` | `name` | Direct. |
| `phoneNumber` | `phone` | Formatted string "(123) 456-7890"; normalized downstream by `normalizePhone()`. |
| `fullAddress` | `address` | Single string. Fall back to `location` if missing. |
| _(none)_ | `streetAddress` | `null` — BZ provides a single address string. |
| Parse from `location` | `city`, `state` | Parse "Dallas, TX" → city="Dallas", state="TX". |
| _(none)_ | `postalCode` | `null` — not in BZ output. |
| `'US'` | `country` | Hardcoded — BZ is US-only. |
| _(none)_ | `latitude`, `longitude` | `null` — geocoded by service layer via Nominatim. |
| _(none)_ | `website` | `null` — not in BZ output. |
| `reviewsCount` | `reviewCount` | Direct — BZ has actual customer reviews. |
| `servicesOffered` | `types` | Direct mapping to string array. |
| _(none)_ | `businessHours` | `null` — scores as `'unknown'` (50/100). |
| entire object | `rawData` | Full Apify response preserved. |
| _(none)_ | `rating` | **`null`** — see Section 3.7 for why we do NOT map `bzScore` to `rating`. |

**What we explicitly do NOT map to `rating` or `reviewCount`:**

- **`bzScore`** → NOT mapped to `rating`. BZ score measures permit history and license quality, not customer satisfaction. It lives in `rawData` and feeds into the new `credentialScore` component (see Section 3.7).
- **`totalPermittedProjects`** → NOT mapped to `reviewCount`. Permit count is a construction-specific activity signal, not a customer feedback metric. Also feeds into `credentialScore`.

**Location parser:**

```typescript
function parseLocation(location: string | null | undefined): { city: string | null; state: string | null } {
  if (!location) return { city: null, state: null };
  const parts = location.split(',').map(s => s.trim());
  return {
    city: parts[0] || null,
    state: parts[1] || null,
  };
}
```

### 3.6 Service Orchestration Changes

The core change replaces the sequential Google-only loop with a parallel multi-provider flow:

```typescript
// Run Google (all queries) and BuildZoom (primary query) in parallel
const [googleResult, buildZoomResult] = await Promise.allSettled([
  this.searchGoogle(searchQueries, geocoded, radiusMeters, sourceCounts),
  this.searchBuildZoom(primaryQuery, searchParams),
]);
```

**Merge and dedup flow:**

1. Collect Google results, track seen phones in a `Set<string>`.
2. Collect BuildZoom results. For each:
   - Skip if normalized phone already seen from Google.
   - Geocode via Nominatim (BZ results lack lat/lon).
   - Add to merged result set.
3. Upsert all vendors using existing phone-based dedup logic.
4. Score & rank the combined set.

**Source counts** in the session's `sources` JSONB:

```json
{
  "google_places:plumber": 18,
  "google_places:plumbing contractor": 12,
  "buildzoom": 7
}
```

No schema change needed — `sources` is already `jsonb`.

**`PlaceSearchParams` extension:**

```typescript
export type PlaceSearchParams = {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;  // NEW — human-readable location for BZ
};
```

### 3.7 Scoring: Source-Aware Vendor Ranking

#### The Problem with Force-Fitting

The current `ScoringInput` was designed around Google Places data: star ratings, review counts, business hours. BuildZoom data measures fundamentally different things:

| Signal | Google Places | BuildZoom |
|---|---|---|
| **Quality** | Star rating (1-5) from customer reviews | `bzScore` — permit history + license quality score |
| **Volume** | `userRatingCount` — number of customer reviews | `totalPermittedProjects` — number of permits filed |
| **Credibility** | _(none)_ | `licenses[]` with status, type, verification date |
| **Activity** | Business hours (open/closed) | `totalProjectsLastXYears`, recent permit dates |
| **Insurance** | _(none)_ | `insurer`, `insuredAmount` |
| **Reviews** | _(implied by rating)_ | `reviewsCount` — BZ has its own customer reviews |

Force-mapping `bzScore` → `rating` or `totalPermittedProjects` → `reviewCount` muddies both signals. A BZ score of 150 does NOT mean 4.2 stars. 300 permits does NOT mean 300 happy customers.

#### Solution: Add a `credentialScore` Component

Extend the scoring model with a new component that captures what BuildZoom uniquely provides — verified professional credentials. This score is source-agnostic and designed for future sources like Yelp, Angi, etc.

**New `ScoringInput` (changes in bold):**

```typescript
export type ScoringInput = {
  distanceMeters: number | null;
  rating: number | null;           // Google stars, BZ reviewsCount-based, Yelp stars, etc.
  reviewCount: number | null;      // Actual customer reviews (Google or BZ reviewsCount)
  categoryMatch: CategoryMatchLevel;
  businessHoursStatus: BusinessHoursStatus;
  credentialSignals: CredentialSignals;  // NEW
};

export type CredentialSignals = {
  hasActiveLicense: boolean | null;     // true if any license has "Active" status
  licenseCount: number;                 // Number of verified licenses
  bzScore: number | null;               // Raw BuildZoom score (null for non-BZ sources)
  isInsured: boolean | null;            // Has insurance on file
  permitCount: number | null;           // Total permitted projects
  recentPermitCount: number | null;     // Projects in last X years (activity signal)
};
```

**New `ScoringWeights`:**

```typescript
export const DEFAULT_WEIGHTS: ScoringWeights = {
  distance:       0.30,   // was 0.35 — slightly reduced
  rating:         0.25,   // was 0.30 — reduced since BZ has fewer reviews
  reviewCount:    0.10,   // was 0.15 — reduced
  categoryMatch:  0.10,   // was 0.15 — reduced
  businessHours:  0.05,   // unchanged
  credential:     0.20,   // NEW — significant weight for professional credibility
};
```

**`credentialScore` calculation:**

```typescript
private calcCredentialScore(signals: CredentialSignals): number {
  let score = 0;

  // Active license: strongest signal (40 points max)
  if (signals.hasActiveLicense === true) score += 40;
  else if (signals.hasActiveLicense === null) score += 0; // unknown, no penalty
  // false = expired/revoked, gets 0

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
    score += Math.min(15, (Math.log(1 + signals.recentPermitCount) / Math.log(51)) * 15);
  }

  return Math.min(100, score);
}
```

#### How Each Source Populates `ScoringInput`

| Field | Google Places | BuildZoom |
|---|---|---|
| `distanceMeters` | From Google's lat/lon | Geocoded via Nominatim from `fullAddress` |
| `rating` | `place.rating` (1-5 stars) | `null` (BZ doesn't have star ratings) |
| `reviewCount` | `place.userRatingCount` | `contractor.reviewsCount` (BZ has customer reviews) |
| `categoryMatch` | `'exact'` (Claude-matched) | `'exact'` (Claude-matched) |
| `businessHoursStatus` | From `regularOpeningHours` | `'unknown'` (BZ has no hours) |
| `credentialSignals.hasActiveLicense` | `null` (Google doesn't know) | `licenses.some(l => l.licenseStatus === 'Active')` |
| `credentialSignals.licenseCount` | `0` | `licenses.length` |
| `credentialSignals.bzScore` | `null` | `parseInt(contractor.bzScore)` |
| `credentialSignals.isInsured` | `null` | `contractor.insurer != null` |
| `credentialSignals.permitCount` | `null` | `contractor.totalPermittedProjects` |
| `credentialSignals.recentPermitCount` | `null` | `contractor.totalProjectsLastXYears` |

**Key insight:** Google vendors score 0 on `credentialScore` (all signals null/0), while BuildZoom vendors score 0 on `rating` (null) and get penalized on `businessHoursStatus` (unknown). The weights balance these inherent asymmetries so neither source is systematically advantaged.

#### Worked Example: Pittsburgh Asphalt Search

Real Google result from your database + hypothetical BZ result from the same search:

**Vendor A: Peter J. Caruso & Sons (Google Places)**

```
distance:    3.2km from search center
rating:      4.80 (13 reviews)
hours:       open
credentials: unknown (Google has no license data)
```

| Component | Raw Score | Weight | Weighted |
|---|---|---|---|
| Distance: `100 × exp(-3.2 / 13.3)` | 78.7 | 0.30 | 23.6 |
| Rating: Bayesian `(10×3.5 + 13×4.8) / 23` → 4.24/5 → 84.7 | 84.7 | 0.25 | 21.2 |
| Review Count: `log(14) / log(501) × 100` | 42.5 | 0.10 | 4.3 |
| Category Match: exact | 100.0 | 0.10 | 10.0 |
| Business Hours: open | 100.0 | 0.05 | 5.0 |
| Credential: all null → 0 | 0.0 | 0.20 | 0.0 |
| **Total** | | | **64.1** |

**Vendor B: Hypothetical BZ Contractor (BuildZoom)**

```
distance:    5.8km (geocoded from fullAddress)
rating:      null (BZ has no star ratings)
reviews:     3 (BZ reviewsCount)
hours:       unknown
credentials: 2 active licenses, bzScore 142, insured, 85 total permits, 22 in last 3 years
```

| Component | Raw Score | Weight | Weighted |
|---|---|---|---|
| Distance: `100 × exp(-5.8 / 13.3)` | 64.7 | 0.30 | 19.4 |
| Rating: null → Bayesian regresses to prior `(10×3.5 + 0×3.5)/10` → 3.5/5 → 70 | 70.0 | 0.25 | 17.5 |
| Review Count: `log(4) / log(501) × 100` | 22.3 | 0.10 | 2.2 |
| Category Match: exact | 100.0 | 0.10 | 10.0 |
| Business Hours: unknown | 50.0 | 0.05 | 2.5 |
| Credential: `40(license) + 10(2×5) + 14.2(bz) + 10(insured) + 10.3(recent)` = 84.5 | 84.5 | 0.20 | 16.9 |
| **Total** | | | **68.5** |

**Result: The BZ vendor ranks higher** despite having no star rating and unknown hours, because its strong credential signals (active licenses, insurance, high BZ score, active permit history) outweigh those gaps. This is the correct behavior — a licensed, insured, actively-permitted contractor SHOULD rank above an unverified Google listing, even if the Google listing has better reviews.

**If Google vendor also had credentials** (e.g., found in both sources), it would score even higher — the credential bonus stacks with the rating/review advantage.

#### Design Principles for Multi-Source Scoring

1. **Never fake data across sources.** Don't map BZ scores to star ratings or permits to reviews. Each signal should represent what it actually measures.
2. **Null means unknown, not zero.** A null `rating` regresses to the Bayesian prior (3.5/5), not 0. A null `hasActiveLicense` scores 0 on that sub-component but doesn't penalize.
3. **Future-proof for additional sources.** `CredentialSignals` is designed so Yelp, Angi, HomeAdvisor, etc. can contribute signals without restructuring. Yelp would add `rating` + `reviewCount` (like Google) but not credentials. A state license API would add `hasActiveLicense` but not reviews.
4. **The weights decide the tradeoff.** If customers care more about reviews than credentials, increase `rating` weight. If they care more about verified licenses, increase `credential` weight. The weights are configurable per organization in the future.

#### Database Impact

New columns needed on `vendor_search_results` to store the credential score:

```sql
ALTER TABLE vendor_search_results
  ADD COLUMN credential_score decimal(5,2);
```

And update `ScoredResult` type and `packages/shared` accordingly. This is a small migration but should be included in Phase 1 since the scoring model changes ship together.

### 3.8 Configuration

**New environment variable:**

| Variable | Required | Default | Description |
|---|---|---|---|
| `APIFY_API_TOKEN` | No | _(none)_ | Apify API token. If absent, BuildZoom is disabled; search is Google-only. |

**`env.validation.ts` addition:**

```typescript
// ── Apify / BuildZoom (optional) ──────────────────────────────────
APIFY_API_TOKEN: z.string().optional(),
```

---

## 4. Database Changes

### Phase 1: Minimal Migration

The existing schema already supports multiple data sources for most tables:

- `vendor_source_records.source`: Free-form text. Currently `'google_places'`, will add `'buildzoom'`.
- `vendor_source_records.source_id`: Will store the BuildZoom profile URL.
- `vendor_source_records.raw_data`: JSONB — stores full Apify response per source.
- `vendor_search_sessions.sources`: JSONB `Record<string, number>` — already supports arbitrary source keys.
- `vendors` unique constraint: `uq_org_vendor_phone` on `(organization_id, phone)` — cross-source dedup works as-is.

**One migration required** — add `credential_score` to `vendor_search_results`:

```sql
ALTER TABLE vendor_search_results
  ADD COLUMN credential_score decimal(5,2);
```

And update `packages/shared/src/database.ts` (per Critical Gotcha in CLAUDE.md) to add `credentialScore: string | null` to the `VendorSearchResult` type.

Also update `scoring.types.ts` to add `credentialScore` to `ScoredResult`.

### Phase 2: Vendor Credential Columns

Denormalize key BuildZoom fields onto the `vendors` table for faster access (currently they live in `rawData` JSONB on `vendor_source_records`):

```sql
ALTER TABLE vendors
  ADD COLUMN license_status text,
  ADD COLUMN license_count integer,
  ADD COLUMN buildzoom_score integer,
  ADD COLUMN buildzoom_url text,
  ADD COLUMN is_insured boolean,
  ADD COLUMN insurer text,
  ADD COLUMN total_permitted_projects integer;
```

With corresponding updates to `packages/shared/src/database.ts`.

---

## 5. Testing Strategy

Per CLAUDE.md: all services use TDD — tests written before implementation.

### 5.1 BuildZoom Provider Tests (`buildzoom.provider.spec.ts`)

| Test Case | Assertion |
|---|---|
| `name` should be `'buildzoom'` | `expect(provider.name).toBe('buildzoom')` |
| Should not throw when `APIFY_API_TOKEN` missing | Constructor completes; `isEnabled === false` |
| Should return `[]` when disabled | No fetch call made |
| Should call Apify URL with correct token and input body | Verify URL, headers, body |
| Should map response array through mapper | 2 contractors → 2 `NormalizedPlace` objects |
| Should return `[]` on non-200 response | Mock 429/500 |
| Should return `[]` on timeout (AbortError) | Mock aborted fetch |
| Should return `[]` on network error | Mock fetch rejection |
| Should return `[]` when response is not an array | Mock `{}` response |
| Should handle empty dataset response | Mock `[]` response |

### 5.2 BuildZoom Mapper Tests (`buildzoom.mapper.spec.ts`)

| Test Case | Assertion |
|---|---|
| Should map full contractor to NormalizedPlace | All fields correct; `source === 'buildzoom'` |
| Should use `url` as `sourceId` | `sourceId === contractor.url` |
| Should fallback `sourceId` to `bz-{contractorName}` | When URL missing |
| Should map `contractorName` to `name` | Direct mapping |
| Should map `phoneNumber` to `phone` | "(123) 456-7890" preserved; normalized downstream |
| Should map `fullAddress` to `address` | Direct mapping; fallback to `location` |
| Should parse `location` "City, ST" into `city` and `state` | "Dallas, TX" → city="Dallas", state="TX" |
| Should NOT map `bzScore` to `rating` | `rating === null` |
| Should map `reviewsCount` to `reviewCount` | Direct mapping — BZ has actual reviews |
| Should NOT map `totalPermittedProjects` to `reviewCount` | Permit count stays in rawData only |
| Should map `servicesOffered` to `types` | Direct array mapping |
| Should set lat/lon to `null` | Geocoded later |
| Should set `country` to `'US'` always | BZ is US-only |
| Should preserve full contractor in `rawData` | Deep equality check |
| Should handle missing optional fields | Only `contractorName` + `url` → no throw |

### 5.3 Credential Scoring Tests (added to `vendor-scoring.service.spec.ts`)

| Test Case | Assertion |
|---|---|
| Should return 0 for empty credential signals | All nulls/zeros → credentialScore 0 |
| Should score active license at 40 | `hasActiveLicense: true` → at least 40 |
| Should score multiple licenses | 3 licenses → 15 (capped) |
| Should score bzScore on 0-200 scale | bzScore 150 → ~15/20 |
| Should score insurance at 10 | `isInsured: true` → +10 |
| Should score recent permits on log scale | 50 recent → ~15 (near cap) |
| Should cap at 100 | All max signals → 100, not higher |
| Should weight credential at 0.20 in total | Verify weighted contribution |
| BZ vendor with strong credentials should outscore Google vendor with no credentials (comparable distance) | The worked example scenario |

### 5.3 Integration Tests (updates to `vendor-sourcing.service.spec.ts`)

| Test Case | Assertion |
|---|---|
| Should call both providers in parallel | Both mocks called |
| Should geocode BuildZoom results lacking coordinates | Nominatim called with BZ address |
| Should deduplicate across sources by phone | Same phone → one vendor |
| Should continue with Google-only when BZ fails | BZ rejects → Google results returned |
| Should continue with Google-only when BZ disabled | `isEnabled = false` → Google only |
| Should track BuildZoom in session `sourceCounts` | `sources` JSON has `buildzoom` key |

### 5.4 TDD Workflow

```bash
# 1. Write specs (red)
# 2. Implement stubs (green)
# 3. Refactor
# 4. Run full suite
bun test apps/api/src/integrations/vendor-sourcing/
```

---

## 6. Error Handling & Resilience

### 6.1 Timeout Handling

| Scenario | Behavior |
|---|---|
| Response within 90s | Normal flow |
| Response 90s+ | `AbortController` fires. Provider logs `warn`, returns `[]`. Google unaffected. |
| Apify hangs indefinitely | Same — settles at 90s. |

### 6.2 Apify Rate Limits / Quota

| Scenario | HTTP Code | Behavior |
|---|---|---|
| Rate limited | `429` | Returns `[]`, warns |
| Quota exhausted | `402` / `429` | Returns `[]`, warns |
| Invalid token | `401` | Returns `[]`, warns |
| Actor not found | `404` | Returns `[]`, warns |

**No retry logic in Phase 1.** BuildZoom is an enrichment, not critical path. Phase 2 can add 1 retry with exponential backoff.

### 6.3 Graceful Degradation Matrix

```
BuildZoom disabled (no token)  → Google-only results, no error logged
BuildZoom times out            → Google-only results, warn logged
BuildZoom returns error        → Google-only results, warn logged
BuildZoom returns empty        → Google-only results, info logged
Google fails + BuildZoom works → BuildZoom-only results (rare)
Both fail                      → 0 candidates, session status "completed"
```

Session is only marked `'failed'` on unrecoverable errors (e.g., DB write failure), not on provider-level failures.

### 6.4 Logging

All logging via injected Pino `Logger` (never `console.log` per CLAUDE.md).

| Event | Level |
|---|---|
| BZ disabled (no token) | `warn` |
| BZ search started | `log` |
| BZ results received | `log` |
| BZ timeout | `warn` |
| BZ HTTP error | `warn` |
| BZ network error | `error` |
| Cross-source dedup match | `log` |
| Overall search summary | `log` |

---

## 7. Open Questions & Risks

| # | Item | Type | Mitigation |
|---|------|------|------------|
| 1 | **BuildZoom output schema unconfirmed.** Field names and nesting are assumptions until trial run. | Open Question | Run trial before finalizing mapper. Types use `[key: string]: unknown` catch-all. |
| 2 | **Apify actor is third-party maintained.** Could break if BuildZoom changes their site. | Risk | Graceful degradation. Monitor consecutive failures. Evaluate actor maintenance history. |
| 3 | **Apify sync endpoint latency (30-60s).** Increases overall search time. | Risk | Parallel execution. Set 90s timeout. Phase 3 can stream Google results first. |
| 4 | **$49.99/month ongoing cost.** Fixed monthly expense regardless of volume. | Risk | Low severity. Monitor usage. Re-evaluate at scale. |
| 5 | **Scraper reliability unknown.** No historical uptime data. | Open Question | Track error/timeout rates from day one. Threshold: >20% failure over 24h triggers review. |
| 6 | **Regional coverage varies.** Strong in major metros, thin in rural areas. | Risk | Google provides fallback. Log BZ-only vs Google-only vs overlap ratios by region. |

---

## 8. Rollout Plan

### Phase 1 — Integration with Existing Scoring

Add BuildZoom as a parallel data source using only Google-compatible fields. BZ-specific fields stored in `rawData` but not yet scored. Goal: increase unique vendor candidates per search without changing scoring.

**Exit criteria:** BZ results merged, deduplicated by phone, scored with existing model. Graceful degradation verified. Source provenance recorded.

### Phase 2 — Enhanced Scoring with BZ-Specific Signals

Update scoring model to incorporate: active license status, BZ quality score, permit volume/recency, insurance/bond verification. Vendors with verified credentials rank higher.

**Exit criteria:** Scoring weights BZ signals. A/B comparison shows measurable quality improvement.

### Phase 3 — UI Source Attribution

Add visual indicators in the frontend showing which data sources contributed to each vendor result (badges, license icons, permit summaries).

**Exit criteria:** Source attribution visible on results. Dispatchers can distinguish between Google-only, BZ-only, and multi-source vendors.

---

## 9. Success Metrics

### Coverage Impact

- **Unique vendor count per search**: Target 15-30% increase vs Google-only baseline.
- **Source distribution**: Track Google-only / BZ-only / overlap ratios.
- **Regional coverage**: Measure BZ hit rate by metro area.

### Performance Impact

- **Search latency (p50, p95)**: Target p50 increase ≤5s, p95 ≤15s (parallel execution + timeouts).
- **BuildZoom provider latency (p50, p95)**: Isolated measurement for timeout tuning.

### Data Quality

- **License/credential enrichment rate**: Target >50% of BZ results carry at least one verified credential.
- **Permit history availability**: Leading indicator of data depth.

### Reliability

- **BuildZoom error/timeout rate**: Target <10% in steady state.
- **Graceful degradation success**: Should be 100% of BZ failures.
- **Actor availability**: Track 7-day and 30-day rolling uptime.

---

## Appendix A: Existing Architecture Reference

### Provider Interface (`provider.interface.ts`)

```typescript
export type PlaceSearchParams = {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;  // Added for BuildZoom
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
```

### Current Module Registration

```typescript
@Module({
  imports: [OrganizationSettingsModule, BlueFolderModule],
  controllers: [VendorSourcingController],
  providers: [
    VendorSourcingService,
    GooglePlacesProvider,
    NominatimProvider,
    SearchQueryGeneratorService,
    VendorScoringService,
    TradeCategoriesService,
    // BuildZoomProvider ← will be added here
  ],
})
export class VendorSourcingModule {}
```

### Current Scoring Weights

```typescript
export const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.35,
  rating: 0.30,
  reviewCount: 0.15,
  categoryMatch: 0.15,
  businessHours: 0.05,
};
```

### Database Tables (vendor-related)

| Table | Dedup Key | Relevant for BZ |
|---|---|---|
| `vendors` | `(organization_id, phone)` | Phone-based cross-source dedup |
| `vendor_source_records` | `(vendor_id, source, source_id)` | `source='buildzoom'`, `source_id`=BZ URL |
| `vendor_search_sessions` | `id` | `sources` JSONB gets `buildzoom` key |
| `vendor_search_results` | `(session_id, vendor_id)` | No change |

### Env Validation Schema Location

`apps/api/src/config/env.validation.ts` — Zod schema validated at startup via NestJS `ConfigModule`.

### Real Search Data (for Apify trial testing)

From the `vendor_search_sessions` table:

| Query | Address | Results |
|---|---|---|
| `asphalt pothole patching repair contractor Pittsburgh PA` | `3299 Saw Mill Run Blvd, Pittsburgh, PA, 15227` | 5 |
| `commercial plumber hand sink repair Cheektowaga NY` | `2761 Harlem Rd, Cheektowaga, NY, 14225` | 5 |
| `walk-in freezer repair commercial refrigeration Blairs VA` | `6020 US 29, Blairs, VA, 24527` | 5 |

Use these as test inputs for the Apify trial to compare overlap with existing Google results.

---

## Appendix B: Post-Trial Checklist

The Apify actor docs have confirmed the output schema (see Section 3.4). The trial run should validate these assumptions against real data.

After running the Apify trial:

- [ ] Capture 2-3 raw JSON objects from the dataset output
- [ ] Confirm `contractorName`, `url`, `phoneNumber`, `fullAddress`, `bzScore` fields match documented names
- [ ] Verify `url` is unique per contractor and is a valid BZ profile URL
- [ ] Verify `phoneNumber` format — docs show "(123) 456-7890" — confirm `normalizePhone()` handles it
- [ ] Check `bzScore` — docs show it as a string ("150"). Confirm range and whether it can exceed 200
- [ ] Verify `licenses[]` array structure — does every contractor have at least one? What does an empty array look like?
- [ ] Check `reviewsCount` — how many contractors actually have reviews? (May be sparse)
- [ ] Verify `servicesOffered` is a string array, not comma-separated
- [ ] Check `permits[]` — how many permits per contractor on average? (Can be up to 300)
- [ ] Check `totalPermittedProjects` vs `numberOfProjects` — are they always equal?
- [ ] Test with all three real searches from Appendix A — note coverage overlap with Google
- [ ] Measure Apify latency for each run (expected 30-60s)
- [ ] Spot-check: for any BZ contractors that overlap with Google results (same phone), compare the data quality
