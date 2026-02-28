import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ScrapeOptions,
  ScrapeResult,
  ScrapeJsonResult,
  MapOptions,
} from './firecrawl.types';

const BASE_URL = 'https://api.firecrawl.dev/v2';
const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class FirecrawlService {
  private readonly logger = new Logger(FirecrawlService.name);
  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('FIRECRAWL_API_KEY') ?? null;
    if (!this.apiKey) {
      this.logger.warn('FIRECRAWL_API_KEY not configured. Firecrawl disabled.');
    }
  }

  get isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async scrape(
    url: string,
    options?: ScrapeOptions,
  ): Promise<ScrapeResult | null> {
    if (!this.apiKey) return null;

    const body: Record<string, unknown> = { url, ...options };
    const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;

    try {
      const response = await this.post('/scrape', body, timeoutMs);
      if (!response) return null;

      const json = await response.json();
      const data = (json as Record<string, unknown>).data as
        | Record<string, unknown>
        | undefined;
      if (!data) return null;

      return {
        markdown: data.markdown as string | undefined,
        links: data.links as string[] | undefined,
        json: data.json as Record<string, unknown> | undefined,
        metadata: data.metadata as Record<string, unknown> | undefined,
      };
    } catch (error) {
      this.logError('scrape', url, error);
      return null;
    }
  }

  async scrapeJson<T>(
    url: string,
    schema: Record<string, unknown>,
    prompt: string,
    options?: Omit<ScrapeOptions, 'formats'>,
  ): Promise<ScrapeJsonResult<T> | null> {
    if (!this.apiKey) return null;

    const body: Record<string, unknown> = {
      url,
      formats: [{ type: 'json', schema, prompt }],
      ...options,
    };
    const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;

    try {
      const response = await this.post('/scrape', body, timeoutMs);
      if (!response) return null;

      const json = await response.json();
      const data = (json as Record<string, unknown>).data as
        | Record<string, unknown>
        | undefined;
      if (!data) return null;

      const extracted = data.json as T | undefined;
      if (extracted === undefined || extracted === null) return null;

      return {
        data: extracted,
        metadata: (data.metadata as Record<string, unknown>) ?? {},
      };
    } catch (error) {
      this.logError('scrapeJson', url, error);
      return null;
    }
  }

  async map(url: string, options?: MapOptions): Promise<string[]> {
    if (!this.apiKey) return [];

    const body: Record<string, unknown> = { url, ...options };

    try {
      const response = await this.post('/map', body, DEFAULT_TIMEOUT_MS);
      if (!response) return [];

      const json = await response.json();
      const links = (json as Record<string, unknown>).links;
      if (!Array.isArray(links)) return [];

      return links as string[];
    } catch (error) {
      this.logError('map', url, error);
      return [];
    }
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Response | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      this.logger.debug(`Firecrawl ${path}: ${JSON.stringify(body)}`);

      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `Firecrawl ${path} failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private logError(method: string, url: string, error: unknown): void {
    if (error instanceof Error && error.name === 'AbortError') {
      this.logger.warn(`Firecrawl ${method} timed out for ${url}`);
    } else {
      this.logger.error(`Firecrawl ${method} error for ${url}`, error);
    }
  }
}
