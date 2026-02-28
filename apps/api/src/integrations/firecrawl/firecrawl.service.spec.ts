import { ConfigService } from '@nestjs/config';
import { FirecrawlService } from './firecrawl.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeConfig(apiKey: string | undefined): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'FIRECRAWL_API_KEY') return apiKey;
      return undefined;
    }),
  } as unknown as ConfigService;
}

describe('FirecrawlService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ── isConfigured ──────────────────────────────────────────────────

  it('should return isConfigured = false when API key is missing', () => {
    const service = new FirecrawlService(makeConfig(undefined));
    expect(service.isConfigured).toBe(false);
  });

  it('should return isConfigured = true when API key is present', () => {
    const service = new FirecrawlService(makeConfig('fc-test-key'));
    expect(service.isConfigured).toBe(true);
  });

  // ── scrape() ──────────────────────────────────────────────────────

  describe('scrape()', () => {
    it('should send correct headers with Authorization Bearer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { markdown: '# Hello', metadata: {} },
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-my-key'));
      await service.scrape('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/scrape',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fc-my-key',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should send url and options in the request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { links: ['https://example.com/a'], metadata: {} },
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      await service.scrape('https://example.com/page', {
        formats: ['links'],
        onlyMainContent: true,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.url).toBe('https://example.com/page');
      expect(body.formats).toEqual(['links']);
      expect(body.onlyMainContent).toBe(true);
    });

    it('should return parsed ScrapeResult on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            markdown: '# Page',
            links: ['https://example.com/a'],
            metadata: { title: 'Page' },
          },
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrape('https://example.com');

      expect(result).toEqual({
        markdown: '# Page',
        links: ['https://example.com/a'],
        metadata: { title: 'Page' },
      });
    });

    it('should return null on non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrape('https://example.com');
      expect(result).toBeNull();
    });

    it('should return null on timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrape('https://example.com');
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrape('https://example.com');
      expect(result).toBeNull();
    });

    it('should return null when not configured', async () => {
      const service = new FirecrawlService(makeConfig(undefined));
      const result = await service.scrape('https://example.com');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── scrapeJson() ──────────────────────────────────────────────────

  describe('scrapeJson()', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };

    it('should return { data, metadata } from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            json: { name: 'Acme Plumbing' },
            metadata: { description: '10 building permits', title: 'Acme' },
          },
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrapeJson<{ name: string }>(
        'https://example.com/contractor/acme',
        schema,
        'Extract contractor info',
      );

      expect(result).toEqual({
        data: { name: 'Acme Plumbing' },
        metadata: { description: '10 building permits', title: 'Acme' },
      });
    });

    it('should send json format with schema and prompt in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            json: { name: 'Test' },
            metadata: {},
          },
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      await service.scrapeJson('https://example.com', schema, 'Extract data', {
        waitFor: 5000,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.formats).toEqual([
        { type: 'json', schema, prompt: 'Extract data' },
      ]);
      expect(body.waitFor).toBe(5000);
    });

    it('should return null when json field is missing from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            markdown: '# Page without JSON',
            metadata: {},
          },
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrapeJson(
        'https://example.com',
        schema,
        'Extract data',
      );
      expect(result).toBeNull();
    });

    it('should return null on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.scrapeJson(
        'https://example.com',
        schema,
        'Extract data',
      );
      expect(result).toBeNull();
    });

    it('should return null when not configured', async () => {
      const service = new FirecrawlService(makeConfig(undefined));
      const result = await service.scrapeJson(
        'https://example.com',
        schema,
        'Extract data',
      );
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── map() ─────────────────────────────────────────────────────────

  describe('map()', () => {
    it('should return array of URLs from response links', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          links: [
            'https://example.com/page1',
            'https://example.com/page2',
          ],
        }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.map('https://example.com');

      expect(result).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
      ]);
    });

    it('should send url and options in the request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, links: [] }),
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      await service.map('https://example.com', {
        search: 'contractor',
        limit: 50,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.url).toBe('https://example.com');
      expect(body.search).toBe('contractor');
      expect(body.limit).toBe(50);
    });

    it('should return [] on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.map('https://example.com');
      expect(result).toEqual([]);
    });

    it('should return [] on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      const service = new FirecrawlService(makeConfig('fc-key'));
      const result = await service.map('https://example.com');
      expect(result).toEqual([]);
    });

    it('should return [] when not configured', async () => {
      const service = new FirecrawlService(makeConfig(undefined));
      const result = await service.map('https://example.com');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
