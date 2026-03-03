import { Injectable, Logger } from '@nestjs/common';
import type {
  PlaceProvider,
  PlaceSearchParams,
  NormalizedPlace,
} from './provider.interface';
import type {
  BuildZoomContractor,
  BuildZoomLicense,
} from '../types/buildzoom-api.types';
import { mapBuildZoomContractor } from '../mappers/buildzoom.mapper';
import { FirecrawlService } from '../../firecrawl/firecrawl.service';

const MAX_DISCOVERED_URLS = 10;
const PROFILE_WAIT_MS = 2000;

const CONTRACTOR_SCHEMA = {
  type: 'object',
  properties: {
    contractorName: { type: 'string' },
    phoneNumber: { type: 'string' },
    location: { type: 'string' },
    fullAddress: { type: 'string' },
    bzScore: { type: 'string' },
    numberOfProjects: { type: 'number' },
    totalPermittedProjects: { type: 'number' },
    totalProjectsLastXYears: { type: 'number' },
    typicalPermitValue: { type: 'string' },
    insurer: { type: 'string' },
    insuredAmount: { type: 'string' },
    reviewsCount: { type: 'number' },
    licenses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          licenseNumber: { type: 'string' },
          licenseStatus: { type: 'string' },
          licenseCity: { type: 'string' },
          licenseType: { type: 'string' },
          licenseBusinessType: { type: 'string' },
        },
      },
    },
    servicesOffered: { type: 'array', items: { type: 'string' } },
    email: { type: 'string' },
  },
};

const EXTRACTION_PROMPT = `Extract all visible contractor information from this BuildZoom profile page.
Look for: contractor name, phone number, email address, BZ score (rating number), location/address,
insurance provider and amount, license numbers and status, number of projects/permits,
and services offered. Extract license details from the sidebar if visible.
Return numeric values as numbers (not strings) where appropriate, except bzScore which should be a string.`;

@Injectable()
export class BuildZoomProvider implements PlaceProvider {
  readonly name = 'buildzoom';
  private readonly logger = new Logger(BuildZoomProvider.name);

  constructor(private readonly firecrawl: FirecrawlService) {}

  get isEnabled(): boolean {
    return this.firecrawl.isConfigured;
  }

  async search(params: PlaceSearchParams): Promise<NormalizedPlace[]> {
    if (!this.isEnabled) return [];
    if (!params.locationName) return [];

    const urls = await this.discoverProfileUrls(params);
    if (urls.length === 0) return [];

    return this.scrapeProfiles(urls);
  }

  async discoverProfileUrls(params: PlaceSearchParams): Promise<string[]> {
    if (!this.isEnabled) return [];
    if (!params.locationName) return [];

    const trade = params.tradeCategory ?? params.query;
    const searchUrl = buildSearchUrl(params.locationName, trade);
    this.logger.log(`BuildZoom search: "${trade}" in "${params.locationName}"`);

    const result = await this.firecrawl.scrape(searchUrl, {
      formats: ['links'],
    });

    if (!result?.links) {
      this.logger.warn('BuildZoom search page returned no links');
      return [];
    }

    const profileUrls = extractProfileUrls(result.links).slice(0, MAX_DISCOVERED_URLS);
    if (profileUrls.length === 0) {
      this.logger.warn('No contractor profile URLs found on search page');
      return [];
    }

    this.logger.log(`Found ${profileUrls.length} BuildZoom profile URLs`);
    return profileUrls;
  }

  async scrapeProfiles(urls: string[]): Promise<NormalizedPlace[]> {
    if (urls.length === 0) return [];

    const settled = await Promise.allSettled(
      urls.map((url) => this.scrapeProfile(url)),
    );

    const contractors = settled
      .filter(
        (entry): entry is PromiseFulfilledResult<BuildZoomContractor> =>
          entry.status === 'fulfilled' && entry.value !== null,
      )
      .map((entry) => entry.value);

    this.logger.log(
      `BuildZoom extracted ${contractors.length}/${urls.length} profiles`,
    );

    return contractors.map(mapBuildZoomContractor);
  }

  private async scrapeProfile(
    url: string,
  ): Promise<BuildZoomContractor | null> {
    const result = await this.firecrawl.scrapeJson<BuildZoomContractor>(
      url,
      CONTRACTOR_SCHEMA,
      EXTRACTION_PROMPT,
      { waitFor: PROFILE_WAIT_MS },
    );

    if (!result) return null;

    const description =
      (result.metadata?.description as string) ?? null;
    const merged = mergeWithMetadata(
      { ...result.data, url },
      description ? parseMetadataDescription(description) : {},
    );

    if (description) {
      merged.description = description;
    }

    return merged;
  }
}

// ── Helpers (exported for testing) ──────────────────────────────────────

/** Maps trade category names to BuildZoom's URL slugs. */
const BUILDZOOM_SLUG_MAP: Record<string, string> = {
  electrical: 'electricians',
  hvac: 'hvac-contractors',
  'general maintenance': 'general-contractors',
  'paving & asphalt': 'paving-contractors',
};

export function buildSearchUrl(
  locationName: string,
  query: string,
): string {
  const locationSlug = locationName
    .toLowerCase()
    .replace(/,\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const knownSlug = BUILDZOOM_SLUG_MAP[query.toLowerCase()];
  if (knownSlug) {
    return `https://www.buildzoom.com/${locationSlug}/${knownSlug}`;
  }

  let tradeSlug = query.toLowerCase().replace(/\s+/g, '-');
  // Only pluralize profession nouns (plumber→plumbers, contractor→contractors).
  // Skip abstract/gerund trade names (refrigeration, plumbing, roofing, maintenance).
  const lastWord = query.toLowerCase().split(/\s+/).pop() ?? '';
  if (!tradeSlug.endsWith('s') && !/(?:tion|ing|ment|ance|ence)$/.test(lastWord)) {
    tradeSlug += 's';
  }

  return `https://www.buildzoom.com/${locationSlug}/${tradeSlug}`;
}

export function extractProfileUrls(links: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const link of links) {
    const cleaned = link.split('#')[0];
    if (!/\/contractor\/[^/]+/.test(cleaned)) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }

  return result;
}

export function parseMetadataDescription(
  description: string,
): Partial<BuildZoomContractor> {
  const partial: Partial<BuildZoomContractor> = {};

  const permitMatch = description.match(/(\d+)\s+building\s+permits?/i);
  if (permitMatch) {
    partial.totalPermittedProjects = parseInt(permitMatch[1], 10);
  }

  const valueMatch = description.match(
    /for\s+\$([0-9,]+)/i,
  );
  if (valueMatch) {
    partial.typicalPermitValue = `$${valueMatch[1]}`;
  }

  const licenseMatch = description.match(/License:\s*([A-Z0-9][A-Z0-9, ]+)/i);
  if (licenseMatch) {
    const numbers = licenseMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    partial.licenses = numbers.map(
      (num): BuildZoomLicense => ({
        licenseNumber: num,
        licenseStatus: 'Unknown',
        licenseCity: '',
        licenseType: '',
        licenseBusinessType: '',
        licenseVerificationDate: '',
        licenseVerificationLink: '',
      }),
    );
  }

  const reviewMatch = description.match(/(\d+)\s+reviews?/i);
  if (reviewMatch) {
    partial.reviewsCount = parseInt(reviewMatch[1], 10);
  }

  // Services: text in the sentence segment just before "License:"
  const licenseIdx = description.indexOf('License:');
  if (licenseIdx > 0) {
    const beforeLicense = description.slice(0, licenseIdx).trimEnd();
    // Strip trailing period if present
    const stripped = beforeLicense.endsWith('.')
      ? beforeLicense.slice(0, -1)
      : beforeLicense;
    const lastDot = stripped.lastIndexOf('.');
    if (lastDot >= 0) {
      const servicesText = stripped.slice(lastDot + 1).trim();
      if (servicesText.length > 2) {
        partial.servicesOffered = servicesText
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }
  }

  return partial;
}

export function mergeWithMetadata(
  json: BuildZoomContractor,
  metadata: Partial<BuildZoomContractor>,
): BuildZoomContractor {
  const merged = { ...json };

  if (
    (!merged.licenses || merged.licenses.length === 0) &&
    metadata.licenses?.length
  ) {
    merged.licenses = metadata.licenses;
  }

  if (!merged.totalPermittedProjects && metadata.totalPermittedProjects) {
    merged.totalPermittedProjects = metadata.totalPermittedProjects;
  }

  if (
    merged.numberOfProjects &&
    merged.numberOfProjects > 0 &&
    !merged.totalPermittedProjects
  ) {
    merged.totalPermittedProjects = merged.numberOfProjects;
  }

  if (
    (!merged.servicesOffered || merged.servicesOffered.length === 0) &&
    metadata.servicesOffered?.length
  ) {
    merged.servicesOffered = metadata.servicesOffered;
  }

  if (!merged.typicalPermitValue && metadata.typicalPermitValue) {
    merged.typicalPermitValue = metadata.typicalPermitValue;
  }

  if (!merged.reviewsCount && metadata.reviewsCount) {
    merged.reviewsCount = metadata.reviewsCount;
  }

  return merged;
}
