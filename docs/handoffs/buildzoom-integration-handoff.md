# Handoff: BuildZoom Integration (Phase 1)

**Date:** 2026-02-28
**Branch:** `dev`
**PRD:** `docs/prds/buildzoom-integration.md`

---

## What was built

Full BuildZoom integration per the PRD. All code is complete, tested (343 tests passing, 0 failures), and the `credential_score` DB column is live. The only missing piece is a working data source — the Apify scraper is broken and needs to be replaced with a custom Firecrawl-based scraper.

---

## Files created (5)

| File | Purpose |
|------|---------|
| `apps/api/src/integrations/vendor-sourcing/providers/buildzoom.provider.ts` | Apify actor client — Bearer auth, 90s AbortController timeout, soft-fail constructor (`isEnabled` flag). **This is the file to replace with Firecrawl.** |
| `apps/api/src/integrations/vendor-sourcing/providers/buildzoom.provider.spec.ts` | 10 tests: disabled state, auth, mapping, HTTP errors, timeouts, empty responses |
| `apps/api/src/integrations/vendor-sourcing/types/buildzoom-api.types.ts` | `BuildZoomContractor`, `BuildZoomLicense`, `BuildZoomPermit`, `BuildZoomEmployee`, `BuildZoomActorInput` |
| `apps/api/src/integrations/vendor-sourcing/mappers/buildzoom.mapper.ts` | `mapBuildZoomContractor()` + `parseLocation()` pure functions |
| `apps/api/src/integrations/vendor-sourcing/mappers/buildzoom.mapper.spec.ts` | 15 tests covering all field mappings, edge cases, null safety |

## Files modified (9)

| File | Change |
|------|--------|
| `vendor-sourcing.service.ts` | Refactored to `Promise.allSettled` parallel search (Google + BZ). Added cross-source phone dedup, BZ geocoding via Nominatim, `extractCredentialSignals()` from rawData, `deriveLocationName()` for BZ location queries, source-aware `googlePlaceId` handling |
| `vendor-sourcing.service.spec.ts` | Added `mockBuildZoom` provider + 6 new tests: parallel execution, geocoding BZ results, cross-source dedup, graceful degradation (BZ fail/disabled), credential scores in response |
| `vendor-sourcing.module.ts` | Registered `BuildZoomProvider` |
| `scoring/scoring.types.ts` | Added `CredentialSignals`, `EMPTY_CREDENTIALS`, `credentialScore` to `ScoredResult`, new weight defaults (credential: 0.20) — rebalanced all weights per PRD Section 3.7 |
| `scoring/vendor-scoring.service.ts` | Added public `calcCredentialScore()` — license status (40pts), license count (15pts cap), BZ score (20pts), insurance (10pts), recent permits (15pts log scale), hard cap at 100 |
| `scoring/vendor-scoring.service.spec.ts` | 9 new credential tests including the worked example from the PRD (BZ vendor 68.5 > Google vendor 64.1) |
| `providers/provider.interface.ts` | Added optional `locationName` to `PlaceSearchParams` |
| `config/env.validation.ts` | Added optional `APIFY_API_TOKEN` |
| `mappers/index.ts` | Exported `mapBuildZoomContractor` |

## Shared package + DB schema (3)

| File | Change |
|------|--------|
| `packages/shared/src/vendor-sourcing.ts` | Added `sources?: string[]` and `credential: number \| null` to `VendorCandidate.scores` |
| `packages/shared/src/database.ts` | Added `credentialScore: string \| null` to `VendorSearchResult` |
| `apps/api/src/core/database/schema/vendor-search-results.ts` | Added `credential_score` decimal(5,2) column |

**DB migration applied:** `credential_score` column added to `vendor_search_results` via direct SQL (drizzle-kit push has an EPIPE bug in non-interactive terminals).

---

## Key discovery: Apify scraper is broken

- The `actums/buildzoom-scraper` actor runs and exits SUCCEEDED but produces **0 dataset items** on every search
- Dashboard shows "Crawled 0/1 pages" — it can't load BuildZoom's site
- Last actor update: Dec 2025 (build 0.0.48) — BuildZoom likely changed their site structure since then
- We discovered Apify API uses **Bearer auth header** (`Authorization: Bearer {token}`), not query param — corrected in our provider
- **Cancel the Apify free trial** to avoid the $49.99/month charge
- The `.env` has `APIFY_API_TOKEN` set — can be removed or repurposed

---

## What still needs to happen

### 1. Replace Apify with Firecrawl-based BuildZoom scraper

The Apify actor is dead. The recommended replacement is a custom scraper using **Firecrawl** (https://firecrawl.dev), which can extract structured data from web pages using LLM-powered extraction.

**Approach:**

BuildZoom has public search pages at URLs like:
```
https://www.buildzoom.com/contractor/search?location=Pittsburgh,+PA&trade=plumber
```

Each search result links to a contractor profile page like:
```
https://www.buildzoom.com/contractor/acme-plumbing-inc
```

The scraper flow would be:

1. **Scrape the search results page** — Use Firecrawl's `scrape` or `extract` endpoint on the BuildZoom search URL to get a list of contractor profile URLs
2. **Scrape each contractor profile** — For each URL, use Firecrawl's `extract` endpoint with the `BuildZoomContractor` type as the LLM extraction schema to pull structured data (name, phone, address, licenses, permits, BZ score, etc.)
3. **Return as `NormalizedPlace[]`** — Feed through the existing `mapBuildZoomContractor()` mapper

**Implementation:**

The only file that needs to change is `buildzoom.provider.ts`. Everything downstream is already built and tested:

- `BuildZoomContractor` type — defines the shape of extracted data
- `mapBuildZoomContractor()` — converts to `NormalizedPlace`
- `extractCredentialSignals()` — pulls license/permit/insurance data from rawData for scoring
- `calcCredentialScore()` — scores professional credentials (0-100)
- `Promise.allSettled` orchestration — runs Google + BZ in parallel
- Phone-based cross-source dedup — prevents duplicate vendors
- Geocoding pass — BZ results lack lat/lon, Nominatim fills them in
- Graceful degradation — if BZ fails, Google-only results returned

**New env var:** `FIRECRAWL_API_KEY` (replace `APIFY_API_TOKEN` in `env.validation.ts`)

**Key design decision:** Should this be a simple provider swap (Firecrawl calls inside `BuildZoomProvider`) or a separate `FirecrawlService` that the provider delegates to? A separate service makes sense if Firecrawl will be used for other scraping tasks beyond BuildZoom. A simple swap is fine if it's BuildZoom-only.

**Estimated scope:** ~100-150 lines of new provider code + tests. The mapper, types, scoring, orchestration, and shared types are all done.

### 2. Validate BuildZoomContractor type against real data

The `BuildZoomContractor` type was written from Apify actor documentation, not validated against real scraped data. Once Firecrawl produces real contractor profiles, compare the extracted JSON against the type definition and fix any mismatches. Key fields to verify:

- `contractorName` vs `name` — which field name does BZ use?
- `phoneNumber` format — "(412) 555-1234" vs other formats
- `bzScore` — is it a string? What's the range? Can it exceed 200?
- `licenses[]` — does every contractor have this? What does empty look like?
- `servicesOffered` — string array or comma-separated?
- `reviewsCount` — how many contractors actually have reviews?

See PRD Appendix B for the full post-trial checklist.

### 3. Cancel Apify trial

Cancel at https://console.apify.com/billing/subscription before the 30-minute free trial converts to $49.99/month.

---

## Architecture note

The `BuildZoomProvider` is intentionally a thin shell. The real value is in the downstream pipeline:

```
BuildZoomProvider.search()          ← ONLY THIS CHANGES (Apify → Firecrawl)
  → mapBuildZoomContractor()        ← stays (pure function, tested)
  → NormalizedPlace[]               ← stays (shared interface)
  → extractCredentialSignals()      ← stays (reads from rawData)
  → calcCredentialScore()           ← stays (scoring formula, tested)
  → Promise.allSettled parallel     ← stays (orchestration, tested)
  → phone-based dedup              ← stays (cross-source, tested)
  → Nominatim geocoding            ← stays (BZ results lack lat/lon)
  → scoreAndRank()                 ← stays (weighted scoring, tested)
```

Swapping Apify for Firecrawl only touches the provider's `search()` method. Everything else — 106 tests across 10 test suites — remains unchanged.
