import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, max, inArray, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../core/database/database.module';
import {
  vendors,
  vendorSourceRecords,
  vendorSearchSessions,
  vendorSearchResults,
  serviceRequests,
} from '../../core/database/schema';
import { BlueFolderService } from '../bluefolder/bluefolder.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { NominatimProvider } from './providers/nominatim.provider';
import { GooglePlacesProvider } from './providers/google-places.provider';
import { BuildZoomProvider } from './providers/buildzoom.provider';
import { SearchQueryGeneratorService } from './providers/search-query-generator.service';
import { VendorScoringService } from './scoring/vendor-scoring.service';
import { TradeCategoriesService } from './trade-categories/trade-categories.service';
import { EmailEnrichmentService } from './enrichment/email-enrichment.service';
import { normalizePhone } from './mappers';
import type { NormalizedPlace } from './providers/provider.interface';
import type {
  ScoringInput,
  ScoredResult,
  CredentialSignals,
} from './scoring/scoring.types';
import { EMPTY_CREDENTIALS } from './scoring/scoring.types';
import type {
  VendorSearchResponse,
  VendorCandidate,
  LoadMoreVendorsResponse,
  ValidEmail,
} from '@fieldrunner/shared';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../core/database/schema';
import type { BuildZoomContractor } from './types/buildzoom-api.types';

type SearchParams = {
  serviceRequestBluefolderId?: number;
  address?: string;
  tradeCategory?: string;
  radiusMeters?: number;
  initiatedBy?: string;
};

@Injectable()
export class VendorSourcingService {
  private readonly logger = new Logger(VendorSourcingService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly blueFolderService: BlueFolderService,
    private readonly settingsService: OrganizationSettingsService,
    private readonly nominatim: NominatimProvider,
    private readonly googlePlaces: GooglePlacesProvider,
    private readonly buildZoom: BuildZoomProvider,
    private readonly queryGenerator: SearchQueryGeneratorService,
    private readonly scoring: VendorScoringService,
    private readonly tradeCategoriesService: TradeCategoriesService,
    private readonly emailEnrichment: EmailEnrichmentService,
  ) {}

  async search(
    clerkOrgId: string,
    params: SearchParams,
  ): Promise<VendorSearchResponse> {
    const startTime = Date.now();
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    // Seed default trade categories (idempotent)
    await this.tradeCategoriesService.seedDefaults(organizationId);

    // 1. Resolve address and search queries from SR or params
    let address: string;
    let searchQueries: string[];
    let tradeCategory: string | undefined;
    let serviceRequestId: string | null = null;
    let srPostalFallback: string | null = null;

    if (params.serviceRequestBluefolderId) {
      const sr = await this.blueFolderService.getServiceRequest(
        clerkOrgId,
        params.serviceRequestBluefolderId,
      );
      address = this.buildAddressFromSr(sr);
      srPostalFallback = `${sr.customerLocationPostalCode}, ${sr.customerLocationState}`;

      // Use Claude to analyze the SR and generate optimal search queries
      const generated = await this.queryGenerator.generateSearchQueries(sr);
      searchQueries = generated.queries;
      tradeCategory = generated.category;

      this.logger.log(
        `Claude generated queries: ${JSON.stringify(generated.queries)} ` +
          `(category: ${generated.category}, reasoning: ${generated.reasoning})`,
      );

      // Look up internal SR ID
      const srRows = await this.db
        .select({ id: serviceRequests.id })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.organizationId, organizationId),
            eq(serviceRequests.bluefolderId, params.serviceRequestBluefolderId),
          ),
        );
      serviceRequestId = srRows[0]?.id ?? null;
    } else {
      address = params.address ?? '';
      if (params.tradeCategory) {
        tradeCategory = params.tradeCategory;
        const resolved = await this.tradeCategoriesService.resolveSearchQueries(
          organizationId,
          params.tradeCategory,
        );
        searchQueries = resolved.queries;
      } else {
        searchQueries = ['contractor'];
      }
    }

    const radiusMeters = params.radiusMeters ?? 40000;
    const primaryQuery = searchQueries[0] ?? 'contractor';

    // 2. Geocode address
    let geocoded = await this.nominatim.geocode(address);
    if (!geocoded && srPostalFallback) {
      geocoded = await this.nominatim.geocode(srPostalFallback);
    }

    if (!geocoded) {
      return {
        sessionId: '',
        status: 'failed',
        searchQuery: primaryQuery,
        searchAddress: address,
        resultCount: 0,
        durationMs: Date.now() - startTime,
        candidates: [],
        hasMore: false,
      };
    }

    // Derive a human-readable location name for BuildZoom
    const locationName = this.deriveLocationName(address);

    // 3. Create search session
    const [session] = await this.db
      .insert(vendorSearchSessions)
      .values({
        organizationId,
        serviceRequestId,
        tradeCategoryId: null,
        searchQuery: searchQueries.join(' | '),
        searchAddress: address,
        searchLatitude: String(geocoded.latitude),
        searchLongitude: String(geocoded.longitude),
        searchRadiusMeters: radiusMeters,
        status: 'in_progress',
        initiatedBy: params.initiatedBy ?? null,
      })
      .returning();

    try {
      // 4. Run Google Places and BuildZoom in parallel
      const sourceCounts: Record<string, number> = {};

      const [googleResult, buildZoomResult] = await Promise.allSettled([
        this.searchGoogle(searchQueries, geocoded, radiusMeters, sourceCounts),
        this.searchBuildZoom(primaryQuery, geocoded, radiusMeters, locationName, tradeCategory),
      ]);

      // Collect Google results
      const allPlaces: NormalizedPlace[] = [];
      const seenPhones = new Set<string>();
      let googleCount = 0;
      let bzRawCount = 0;
      let bzDedupedCount = 0;

      if (googleResult.status === 'fulfilled') {
        googleCount = googleResult.value.length;
        for (const p of googleResult.value) {
          allPlaces.push(p);
          const norm = normalizePhone(p.phone);
          if (norm) seenPhones.add(norm);
        }
      } else {
        this.logger.error('Google Places search failed', googleResult.reason);
      }

      // Collect BuildZoom results (dedup by phone, geocode missing coords)
      let pendingProfileUrls: string[] = [];
      if (buildZoomResult.status === 'fulfilled') {
        const { places: bzPlaces, pendingUrls } = buildZoomResult.value;
        pendingProfileUrls = pendingUrls;
        bzRawCount = bzPlaces.length;

        if (bzPlaces.length > 0) {
          sourceCounts['buildzoom'] = bzPlaces.length;
          const dedupedBz = this.deduplicateByPhone(bzPlaces, seenPhones);
          bzDedupedCount = dedupedBz.length;
          await this.geocodeMissingCoordinates(dedupedBz);
          allPlaces.push(...dedupedBz);
        }
      } else {
        this.logger.warn('BuildZoom search failed', buildZoomResult.reason);
      }

      // 5. Enrich emails from vendor websites (best-effort)
      const emailsBefore = allPlaces.filter((p) => p.email !== null).length;
      await this.emailEnrichment.enrichPlaces(allPlaces);
      const emailsAfter = allPlaces.filter((p) => p.email !== null).length;
      const emailsFound = emailsAfter - emailsBefore;

      // 6. Deduplicate and upsert vendors
      const vendorIds = await this.upsertVendors(organizationId, allPlaces);

      // 7. Score and rank (dedup by vendorId — multiple places can resolve to
      //    the same vendor when they share a phone number)
      const scoringInputs = this.buildDedupedScoringInputs(
        vendorIds,
        allPlaces,
        geocoded!.latitude,
        geocoded!.longitude,
      );

      const ranked = this.scoring.scoreAndRank(
        scoringInputs,
        radiusMeters,
      );

      // 8. Insert search results
      if (ranked.length > 0) {
        await this.insertSearchResults(
          session.id,
          ranked,
          vendorIds,
          allPlaces,
          geocoded!.latitude,
          geocoded!.longitude,
        );
      }

      // 9. Update session
      const durationMs = Date.now() - startTime;
      await this.db
        .update(vendorSearchSessions)
        .set({
          status: 'completed',
          resultCount: ranked.length,
          sources: sourceCounts,
          pendingProfileUrls: pendingProfileUrls.length > 0 ? pendingProfileUrls : null,
          durationMs,
          completedAt: new Date(),
        })
        .where(eq(vendorSearchSessions.id, session.id));

      // Detailed search summary
      const emailVendors = allPlaces
        .filter((p) => p.email !== null)
        .map((p) => `${p.name} <${p.email}>`);

      this.logger.log([
        `\n========== VENDOR SEARCH COMPLETE ==========`,
        `Session:     ${session.id}`,
        `Query:       ${searchQueries.join(' | ')}`,
        `Address:     ${address}`,
        `Duration:    ${(durationMs / 1000).toFixed(1)}s`,
        ``,
        `--- Sources ---`,
        `Google Places: ${googleCount} vendor(s)`,
        `BuildZoom:     ${bzRawCount} scraped → ${bzDedupedCount} after phone dedup`,
        `Combined:      ${allPlaces.length} unique vendor(s)`,
        ``,
        `--- Email Enrichment ---`,
        `Attempted:   ${allPlaces.filter((p) => p.email === null && p.website !== null).length + emailsFound} vendor(s) with websites`,
        `Found:       ${emailsFound} new email(s)`,
        emailVendors.length > 0
          ? `Emails:      ${emailVendors.join(', ')}`
          : `Emails:      none`,
        ``,
        `--- Scoring ---`,
        `Ranked:      ${ranked.length} vendor(s)`,
        `Top 5:       ${ranked.slice(0, 5).map((r) => {
          const idx = vendorIds.indexOf(r.id);
          const name = idx >= 0 ? allPlaces[idx]?.name : 'unknown';
          return `${name} (${r.scored.totalScore.toFixed(1)})`;
        }).join(', ')}`,
        `============================================`,
      ].join('\n'));

      // 10. Build response
      const candidates = this.buildCandidates(
        ranked,
        vendorIds,
        allPlaces,
        geocoded!.latitude,
        geocoded!.longitude,
      );

      return {
        sessionId: session.id,
        status: 'completed',
        searchQuery: searchQueries.join(' | '),
        searchAddress: address,
        resultCount: ranked.length,
        durationMs,
        candidates,
        hasMore: pendingProfileUrls.length > 0,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.db
        .update(vendorSearchSessions)
        .set({
          status: 'failed',
          errorMessage,
          durationMs,
        })
        .where(eq(vendorSearchSessions.id, session.id));

      this.logger.error(`Vendor search failed: ${errorMessage}`, error instanceof Error ? error.stack : error);

      return {
        sessionId: session.id,
        status: 'failed',
        searchQuery: searchQueries.join(' | '),
        searchAddress: address,
        resultCount: 0,
        durationMs,
        candidates: [],
        hasMore: false,
      };
    }
  }

  private async searchGoogle(
    queries: string[],
    geocoded: { latitude: number; longitude: number },
    radiusMeters: number,
    sourceCounts: Record<string, number>,
  ): Promise<NormalizedPlace[]> {
    const allPlaces: NormalizedPlace[] = [];
    const seenSourceIds = new Set<string>();

    for (const query of queries) {
      const places = await this.googlePlaces.search({
        query,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        radiusMeters,
      });

      sourceCounts[`google_places:${query}`] = places.length;

      for (const p of places) {
        if (!seenSourceIds.has(p.sourceId)) {
          seenSourceIds.add(p.sourceId);
          allPlaces.push(p);
        }
      }
    }

    return allPlaces;
  }

  private async searchBuildZoom(
    query: string,
    geocoded: { latitude: number; longitude: number },
    radiusMeters: number,
    locationName: string,
    tradeCategory?: string,
  ): Promise<{ places: NormalizedPlace[]; pendingUrls: string[] }> {
    if (!this.buildZoom.isEnabled) return { places: [], pendingUrls: [] };

    const params = {
      query,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      radiusMeters,
      locationName,
      tradeCategory,
    };

    const allUrls = await this.buildZoom.discoverProfileUrls(params);
    if (allUrls.length === 0) return { places: [], pendingUrls: [] };

    this.logger.log(
      `BuildZoom URLs: ${allUrls.length} discovered, scraping all`,
    );

    const places = await this.buildZoom.scrapeProfiles(allUrls);
    return { places, pendingUrls: [] };
  }

  async getSession(organizationId: string, sessionId: string) {
    const sessions = await this.db
      .select()
      .from(vendorSearchSessions)
      .where(
        and(
          eq(vendorSearchSessions.id, sessionId),
          eq(vendorSearchSessions.organizationId, organizationId),
        ),
      );

    if (!sessions.length) return null;

    const results = await this.db
      .select()
      .from(vendorSearchResults)
      .where(eq(vendorSearchResults.searchSessionId, sessionId));

    const vendorIds = results.map((r) => r.vendorId);
    const vendorRows =
      vendorIds.length > 0
        ? await this.db
            .select()
            .from(vendors)
            .where(inArray(vendors.id, vendorIds))
        : [];

    return {
      session: sessions[0],
      results,
      vendors: vendorRows,
    };
  }

  async getResultsByServiceRequest(
    clerkOrgId: string,
    bluefolderId: number,
  ): Promise<VendorSearchResponse | null> {
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    // Find internal SR ID
    const srRows = await this.db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.organizationId, organizationId),
          eq(serviceRequests.bluefolderId, bluefolderId),
        ),
      );

    const serviceRequestId = srRows[0]?.id;
    if (!serviceRequestId) return null;

    // Find latest session for this SR
    const sessions = await this.db
      .select()
      .from(vendorSearchSessions)
      .where(eq(vendorSearchSessions.serviceRequestId, serviceRequestId))
      .orderBy(desc(vendorSearchSessions.createdAt))
      .limit(1);

    const session = sessions[0];
    if (!session) return null;

    // If still in progress, return status without candidates
    if (session.status === 'in_progress') {
      return {
        sessionId: session.id,
        status: 'in_progress',
        searchQuery: session.searchQuery,
        searchAddress: session.searchAddress,
        resultCount: 0,
        durationMs: null,
        candidates: [],
        hasMore: false,
      };
    }

    // Fetch results joined with vendors
    const results = await this.db
      .select()
      .from(vendorSearchResults)
      .where(eq(vendorSearchResults.searchSessionId, session.id));

    const vendorIds = results.map((r) => r.vendorId);
    const vendorRows =
      vendorIds.length > 0
        ? await this.db
            .select()
            .from(vendors)
            .where(inArray(vendors.id, vendorIds))
        : [];

    const vendorMap = new Map(vendorRows.map((v) => [v.id, v]));

    // Map DB rows to VendorCandidate[]
    const candidates: VendorCandidate[] = results
      .sort((a, b) => a.rank - b.rank)
      .map((r) => {
        const v = vendorMap.get(r.vendorId);
        return {
          vendorId: r.vendorId,
          rank: r.rank,
          score: Number(r.score),
          name: v?.name ?? '',
          phone: v?.phone ?? null,
          phoneRaw: v?.phoneRaw ?? null,
          address: v?.address ?? null,
          website: v?.website ?? null,
          email: (v?.email as ValidEmail) ?? null,
          rating: v?.rating != null ? Number(v.rating) : null,
          reviewCount: v?.reviewCount ?? null,
          distanceMeters: r.distanceMeters != null ? Number(r.distanceMeters) : null,
          categories: (v?.categories as string[]) ?? null,
          googlePlaceId: v?.googlePlaceId ?? null,
          sources: [],
          scores: {
            distance: r.distanceScore != null ? Number(r.distanceScore) : null,
            rating: r.ratingScore != null ? Number(r.ratingScore) : null,
            reviewCount: r.reviewCountScore != null ? Number(r.reviewCountScore) : null,
            categoryMatch: r.categoryMatchScore != null ? Number(r.categoryMatchScore) : null,
            businessHours: r.businessHoursScore != null ? Number(r.businessHoursScore) : null,
            credential: r.credentialScore != null ? Number(r.credentialScore) : null,
          },
        };
      });

    return {
      sessionId: session.id,
      status: session.status as VendorSearchResponse['status'],
      searchQuery: session.searchQuery,
      searchAddress: session.searchAddress,
      resultCount: session.resultCount,
      durationMs: session.durationMs,
      candidates,
      hasMore: false,
    };
  }

  async loadMore(
    clerkOrgId: string,
    sessionId: string,
  ): Promise<LoadMoreVendorsResponse> {
    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);

    // 1. Load session
    const sessions = await this.db
      .select()
      .from(vendorSearchSessions)
      .where(
        and(
          eq(vendorSearchSessions.id, sessionId),
          eq(vendorSearchSessions.organizationId, organizationId),
        ),
      );

    const session = sessions[0];
    if (!session) {
      return { sessionId, candidates: [], hasMore: false, resultCount: 0 };
    }

    const pendingUrls = (session.pendingProfileUrls as string[]) ?? [];
    if (pendingUrls.length === 0) {
      return {
        sessionId,
        candidates: [],
        hasMore: false,
        resultCount: session.resultCount,
      };
    }

    // 2. Take next batch
    const urlsToScrape = pendingUrls.slice(0, 5);
    const remainingUrls = pendingUrls.slice(5);

    // 3. Scrape profiles
    this.logger.log(`Load-more scraping ${urlsToScrape.length} BuildZoom profiles`);
    const bzPlaces = await this.buildZoom.scrapeProfiles(urlsToScrape);

    // 4. Dedup against existing session vendors by phone
    const existingResults = await this.db
      .select({ vendorId: vendorSearchResults.vendorId })
      .from(vendorSearchResults)
      .where(eq(vendorSearchResults.searchSessionId, sessionId));

    const existingVendorIds = new Set(existingResults.map((r) => r.vendorId));
    const existingPhones = new Set<string>();

    if (existingVendorIds.size > 0) {
      const existingVendors = await this.db
        .select({ phone: vendors.phone })
        .from(vendors)
        .where(inArray(vendors.id, [...existingVendorIds]));
      for (const v of existingVendors) {
        if (v.phone) existingPhones.add(v.phone);
      }
    }

    const newPlaces = this.deduplicateByPhone(bzPlaces, existingPhones);
    await this.geocodeMissingCoordinates(newPlaces);

    // 5. Enrich emails
    await this.emailEnrichment.enrichPlaces(newPlaces);

    // 6. Upsert vendors
    const vendorIds = await this.upsertVendors(organizationId, newPlaces);

    // 7. Score new vendors (dedup by vendorId)
    const searchLat = Number(session.searchLatitude);
    const searchLng = Number(session.searchLongitude);

    const scoringInputs = this.buildDedupedScoringInputs(
      vendorIds,
      newPlaces,
      searchLat,
      searchLng,
      existingVendorIds,
    );

    const scored = this.scoring.scoreAndRank(
      scoringInputs,
      session.searchRadiusMeters,
    );

    // 8. Get current max rank
    const [{ maxRank }] = await this.db
      .select({ maxRank: max(vendorSearchResults.rank) })
      .from(vendorSearchResults)
      .where(eq(vendorSearchResults.searchSessionId, sessionId));

    const startRank = (maxRank ?? 0) + 1;

    // 9. Insert search results with continuing ranks
    const rankedScored = scored.map((r, i) => ({
      ...r,
      rank: startRank + i,
    }));

    if (rankedScored.length > 0) {
      await this.insertSearchResults(
        sessionId,
        rankedScored,
        vendorIds,
        newPlaces,
        searchLat,
        searchLng,
      );
    }

    // 10. Update session
    const newResultCount = session.resultCount + scored.length;
    await this.db
      .update(vendorSearchSessions)
      .set({
        pendingProfileUrls: remainingUrls.length > 0 ? remainingUrls : null,
        resultCount: newResultCount,
        updatedAt: new Date(),
      })
      .where(eq(vendorSearchSessions.id, sessionId));

    // 11. Build response
    const candidates = this.buildCandidates(
      rankedScored,
      vendorIds,
      newPlaces,
      searchLat,
      searchLng,
    );

    return {
      sessionId,
      candidates,
      hasMore: remainingUrls.length > 0,
      resultCount: newResultCount,
    };
  }

  async listSessions(organizationId: string) {
    return this.db
      .select()
      .from(vendorSearchSessions)
      .where(eq(vendorSearchSessions.organizationId, organizationId));
  }

  async getVendorDetail(organizationId: string, vendorId: string) {
    const vendorRows = await this.db
      .select()
      .from(vendors)
      .where(
        and(
          eq(vendors.id, vendorId),
          eq(vendors.organizationId, organizationId),
        ),
      );

    if (!vendorRows.length) return null;

    const sourceRecords = await this.db
      .select()
      .from(vendorSourceRecords)
      .where(eq(vendorSourceRecords.vendorId, vendorId));

    return { vendor: vendorRows[0], sourceRecords };
  }

  private async upsertVendors(
    organizationId: string,
    places: NormalizedPlace[],
  ): Promise<string[]> {
    const vendorIds: string[] = [];

    for (const p of places) {
      const normalized = normalizePhone(p.phone);

      let existingVendor: { id: string } | undefined;
      if (normalized) {
        const existing = await this.db
          .select({ id: vendors.id })
          .from(vendors)
          .where(
            and(
              eq(vendors.organizationId, organizationId),
              eq(vendors.phone, normalized),
            ),
          );
        existingVendor = existing[0];
      }

      let vendorId: string;
      if (existingVendor) {
        vendorId = existingVendor.id;
        await this.db
          .update(vendors)
          .set({
            name: p.name,
            rating: p.rating !== null ? String(p.rating) : null,
            reviewCount: p.reviewCount,
            website: p.website,
            email: p.email,
            googlePlaceId:
              p.source === 'google_places' ? p.sourceId : undefined,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(vendors.id, vendorId));
      } else {
        const [newVendor] = await this.db
          .insert(vendors)
          .values({
            organizationId,
            name: p.name,
            phone: normalized,
            phoneRaw: p.phone,
            address: p.address,
            streetAddress: p.streetAddress,
            city: p.city,
            state: p.state,
            postalCode: p.postalCode,
            country: p.country,
            latitude: p.latitude !== null ? String(p.latitude) : null,
            longitude: p.longitude !== null ? String(p.longitude) : null,
            website: p.website,
            email: p.email,
            googlePlaceId:
              p.source === 'google_places' ? p.sourceId : null,
            rating: p.rating !== null ? String(p.rating) : null,
            reviewCount: p.reviewCount,
            categories: p.types,
          })
          .returning();
        vendorId = newVendor.id;
      }

      await this.db
        .insert(vendorSourceRecords)
        .values({
          vendorId,
          source: p.source,
          sourceId: p.sourceId,
          rawData: p.rawData,
          name: p.name,
          address: p.address,
          phone: p.phone,
          rating: p.rating !== null ? String(p.rating) : null,
          reviewCount: p.reviewCount,
          website: p.website,
          email: p.email,
          types: p.types,
          businessHours: p.businessHours,
        })
        .onConflictDoNothing();

      vendorIds.push(vendorId);
    }

    return vendorIds;
  }

  private buildDedupedScoringInputs(
    vendorIds: string[],
    places: NormalizedPlace[],
    searchLat: number,
    searchLng: number,
    excludeVendorIds?: Set<string>,
  ): { id: string; input: ScoringInput }[] {
    const seen = new Set<string>(excludeVendorIds);
    const inputs: { id: string; input: ScoringInput }[] = [];

    for (let i = 0; i < places.length; i++) {
      const vid = vendorIds[i];
      if (seen.has(vid)) continue;
      seen.add(vid);
      inputs.push({
        id: vid,
        input: this.buildScoringInput(places[i], searchLat, searchLng),
      });
    }

    return inputs;
  }

  private deduplicateByPhone(
    places: NormalizedPlace[],
    existingPhones: Set<string>,
  ): NormalizedPlace[] {
    const result: NormalizedPlace[] = [];

    for (const p of places) {
      const norm = normalizePhone(p.phone);
      if (norm && existingPhones.has(norm)) continue;
      result.push(p);
      if (norm) existingPhones.add(norm);
    }

    return result;
  }

  private async geocodeMissingCoordinates(
    places: NormalizedPlace[],
  ): Promise<void> {
    for (const p of places) {
      if (p.latitude === null && p.longitude === null && p.address) {
        const geo = await this.nominatim.geocode(p.address);
        if (geo) {
          p.latitude = geo.latitude;
          p.longitude = geo.longitude;
        }
      }
    }
  }

  private async insertSearchResults(
    searchSessionId: string,
    ranked: { id: string; rank: number; scored: ScoredResult }[],
    vendorIds: string[],
    places: NormalizedPlace[],
    searchLat: number,
    searchLng: number,
  ): Promise<void> {
    await this.db.insert(vendorSearchResults).values(
      ranked.map((r) => {
        const placeIdx = vendorIds.indexOf(r.id);
        const p = placeIdx >= 0 ? places[placeIdx] : null;
        const distMeters =
          p?.latitude != null && p?.longitude != null
            ? this.haversine(searchLat, searchLng, p.latitude, p.longitude)
            : null;

        return {
          searchSessionId,
          vendorId: r.id,
          rank: r.rank,
          score: String(r.scored.totalScore),
          distanceScore: String(r.scored.distanceScore),
          ratingScore: String(r.scored.ratingScore),
          reviewCountScore: String(r.scored.reviewCountScore),
          categoryMatchScore: String(r.scored.categoryMatchScore),
          businessHoursScore: String(r.scored.businessHoursScore),
          credentialScore: String(r.scored.credentialScore),
          distanceMeters:
            distMeters !== null ? String(distMeters.toFixed(2)) : null,
        };
      }),
    );
  }

  private buildScoringInput(
    p: NormalizedPlace,
    searchLat: number,
    searchLng: number,
  ): ScoringInput {
    const distanceMeters =
      p.latitude !== null && p.longitude !== null
        ? this.haversine(searchLat, searchLng, p.latitude, p.longitude)
        : null;

    return {
      distanceMeters,
      rating: p.rating,
      reviewCount: p.reviewCount,
      categoryMatch: 'exact', // Claude already selected the right trade
      businessHoursStatus: this.resolveBusinessHours(p.businessHours),
      credentialSignals: this.extractCredentialSignals(p),
    };
  }

  private extractCredentialSignals(p: NormalizedPlace): CredentialSignals {
    if (p.source !== 'buildzoom') return EMPTY_CREDENTIALS;

    const raw = p.rawData as unknown as BuildZoomContractor;
    const licenses = raw.licenses ?? [];

    return {
      hasActiveLicense: licenses.length > 0
        ? licenses.some((l) => l.licenseStatus === 'Active')
        : null,
      licenseCount: licenses.length,
      bzScore: raw.bzScore ? parseInt(raw.bzScore, 10) || null : null,
      isInsured: raw.insurer != null ? true : null,
      permitCount: raw.totalPermittedProjects ?? null,
      recentPermitCount: raw.totalProjectsLastXYears ?? null,
    };
  }

  private resolveBusinessHours(
    hours: Record<string, unknown> | null,
  ): 'open' | 'closing_soon' | 'unknown' | 'closed' {
    if (!hours) return 'unknown';
    if (hours.openNow === true) return 'open';
    if (hours.openNow === false) return 'closed';
    return 'unknown';
  }

  private deriveLocationName(address: string): string {
    // Extract "City, ST" from a full address like "123 Main St, Pittsburgh, PA, 15201"
    const parts = address.split(',').map((s) => s.trim());
    if (parts.length >= 3) {
      return `${parts[parts.length - 3]}, ${parts[parts.length - 2]}`;
    }
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }
    return address;
  }

  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private buildAddressFromSr(sr: {
    customerLocationStreetAddress: string;
    customerLocationCity: string;
    customerLocationState: string;
    customerLocationPostalCode: string;
    customerLocationCountry: string;
  }): string {
    return [
      sr.customerLocationStreetAddress,
      sr.customerLocationCity,
      sr.customerLocationState,
      sr.customerLocationPostalCode,
      sr.customerLocationCountry,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private buildCandidates(
    ranked: { id: string; rank: number; scored: ScoredResult }[],
    vendorIds: string[],
    places: NormalizedPlace[],
    searchLat: number,
    searchLng: number,
  ): VendorCandidate[] {
    return ranked.map((r) => {
      const placeIndex = vendorIds.indexOf(r.id);
      const p = placeIndex >= 0 ? places[placeIndex] : null;

      const distanceMeters =
        p?.latitude != null && p?.longitude != null
          ? this.haversine(searchLat, searchLng, p.latitude, p.longitude)
          : null;

      return {
        vendorId: r.id,
        rank: r.rank,
        score: r.scored.totalScore,
        name: p?.name ?? '',
        phone: normalizePhone(p?.phone) ?? null,
        phoneRaw: p?.phone ?? null,
        address: p?.address ?? null,
        website: p?.website ?? null,
        email: p?.email ?? null,
        rating: p?.rating ?? null,
        reviewCount: p?.reviewCount ?? null,
        distanceMeters,
        categories: p?.types ?? null,
        googlePlaceId:
          p?.source === 'google_places' ? p.sourceId : null,
        sources: p ? [p.source] : [],
        scores: {
          distance: r.scored.distanceScore,
          rating: r.scored.ratingScore,
          reviewCount: r.scored.reviewCountScore,
          categoryMatch: r.scored.categoryMatchScore,
          businessHours: r.scored.businessHoursScore,
          credential: r.scored.credentialScore,
        },
      };
    });
  }
}
