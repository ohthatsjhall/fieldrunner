import { Injectable, Logger } from '@nestjs/common';
import { FirecrawlService } from '../../firecrawl/firecrawl.service';
import { normalizeEmail } from '../mappers/email.util';
import type { NormalizedPlace } from '../providers/provider.interface';

const EMAIL_SCHEMA = {
  type: 'object',
  properties: {
    email: { type: 'string' },
  },
};

const EXTRACTION_PROMPT =
  'Extract the primary contact or business email address from this page. ' +
  'Ignore noreply, no-reply, and generic info@ addresses if a more specific one exists.';

const SCRAPE_TIMEOUT_MS = 15_000;
const CHUNK_SIZE = 5;

@Injectable()
export class EmailEnrichmentService {
  private readonly logger = new Logger(EmailEnrichmentService.name);

  constructor(private readonly firecrawl: FirecrawlService) {}

  async enrichPlaces(places: NormalizedPlace[]): Promise<void> {
    const targets = places.filter(
      (p) => p.email === null && p.website !== null,
    );

    if (targets.length === 0) return;

    this.logger.log(`Email enrichment: ${targets.length} vendor(s) to scrape`);

    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
      const chunk = targets.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((place) => this.scrapeEmail(place)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'rejected') {
          this.logger.warn(
            `Email scrape failed for ${chunk[j].name}: ${result.reason}`,
          );
        }
      }
    }
  }

  private async scrapeEmail(place: NormalizedPlace): Promise<void> {
    const result = await this.firecrawl.scrapeJson<{ email?: string }>(
      place.website!,
      EMAIL_SCHEMA,
      EXTRACTION_PROMPT,
      { timeout: SCRAPE_TIMEOUT_MS },
    );

    if (!result?.data?.email) return;

    const normalized = normalizeEmail(result.data.email);
    if (normalized) {
      place.email = normalized;
      this.logger.log(`Found email for ${place.name}: ${normalized}`);
    }
  }
}
