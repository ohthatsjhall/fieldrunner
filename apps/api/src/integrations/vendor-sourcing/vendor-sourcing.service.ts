import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
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
import { normalizePhone } from './mappers';
import type { NormalizedPlace } from './providers/provider.interface';
import type {
  ScoringInput,
  ScoredResult,
  CredentialSignals,
} from './scoring/scoring.types';
import { EMPTY_CREDENTIALS } from './scoring/scoring.types';
import type { VendorSearchResponse, VendorCandidate } from '@fieldrunner/shared';
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
        this.searchBuildZoom(primaryQuery, geocoded, radiusMeters, locationName),
      ]);

      // Collect Google results
      const allPlaces: NormalizedPlace[] = [];
      const seenPhones = new Set<string>();

      if (googleResult.status === 'fulfilled') {
        for (const p of googleResult.value) {
          allPlaces.push(p);
          const norm = normalizePhone(p.phone);
          if (norm) seenPhones.add(norm);
        }
      } else {
        this.logger.error('Google Places search failed', googleResult.reason);
      }

      // Collect BuildZoom results (dedup by phone, geocode missing coords)
      if (buildZoomResult.status === 'fulfilled' && buildZoomResult.value.length > 0) {
        const bzPlaces = buildZoomResult.value;
        sourceCounts['buildzoom'] = bzPlaces.length;

        for (const p of bzPlaces) {
          const norm = normalizePhone(p.phone);
          if (norm && seenPhones.has(norm)) {
            this.logger.log(`Cross-source dedup: ${p.name} (phone ${norm})`);
            continue;
          }

          // Geocode BuildZoom results (they lack lat/lon)
          if (p.latitude === null && p.longitude === null && p.address) {
            const geo = await this.nominatim.geocode(p.address);
            if (geo) {
              p.latitude = geo.latitude;
              p.longitude = geo.longitude;
            }
          }

          allPlaces.push(p);
          if (norm) seenPhones.add(norm);
        }
      } else if (buildZoomResult.status === 'rejected') {
        this.logger.warn('BuildZoom search failed', buildZoomResult.reason);
      }

      // 5. Deduplicate and upsert vendors
      const vendorIds = await this.upsertVendors(organizationId, allPlaces);

      // 6. Score and rank
      const scoringInputs = allPlaces.map((p, i) => ({
        id: vendorIds[i],
        input: this.buildScoringInput(
          p,
          geocoded!.latitude,
          geocoded!.longitude,
        ),
      }));

      const ranked = this.scoring.scoreAndRank(
        scoringInputs,
        radiusMeters,
        undefined,
        5,
      );

      // 7. Insert search results
      if (ranked.length > 0) {
        await this.db.insert(vendorSearchResults).values(
          ranked.map((r) => {
            const placeIdx = vendorIds.indexOf(r.id);
            const p = placeIdx >= 0 ? allPlaces[placeIdx] : null;
            const distMeters =
              p?.latitude != null && p?.longitude != null
                ? this.haversine(
                    geocoded!.latitude,
                    geocoded!.longitude,
                    p.latitude,
                    p.longitude,
                  )
                : null;

            return {
              searchSessionId: session.id,
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

      // 8. Update session
      const durationMs = Date.now() - startTime;
      await this.db
        .update(vendorSearchSessions)
        .set({
          status: 'completed',
          resultCount: ranked.length,
          sources: sourceCounts,
          durationMs,
          completedAt: new Date(),
        })
        .where(eq(vendorSearchSessions.id, session.id));

      // 9. Build response
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

      this.logger.error('Vendor search failed', error);

      return {
        sessionId: session.id,
        status: 'failed',
        searchQuery: searchQueries.join(' | '),
        searchAddress: address,
        resultCount: 0,
        durationMs,
        candidates: [],
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
  ): Promise<NormalizedPlace[]> {
    if (!this.buildZoom.isEnabled) return [];

    return this.buildZoom.search({
      query,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      radiusMeters,
      locationName,
    });
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
          types: p.types,
          businessHours: p.businessHours,
        })
        .onConflictDoNothing();

      vendorIds.push(vendorId);
    }

    return vendorIds;
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
