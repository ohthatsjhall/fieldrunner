import { Injectable, Logger } from '@nestjs/common';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import {
  BLUEFOLDER_ARRAY_TAGS,
  type BfApiResponse,
  type BfApiError,
} from './types/bluefolder-api.types';

export class BlueFolderApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'BlueFolderApiError';
  }
}

export class BlueFolderRateLimitError extends BlueFolderApiError {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message, '429', 429);
    this.name = 'BlueFolderRateLimitError';
  }
}

@Injectable()
export class BlueFolderClientService {
  private readonly logger = new Logger(BlueFolderClientService.name);
  private readonly baseUrl = 'https://app.bluefolder.com/api/2.0/';

  private readonly parser: XMLParser;
  private readonly builder: XMLBuilder;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      trimValues: true,
      isArray: (tagName) => BLUEFOLDER_ARRAY_TAGS.has(tagName),
    });

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  buildAuthHeader(apiKey: string): string {
    return `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`;
  }

  buildRequestXml(body: Record<string, unknown>): string {
    return this.builder.build({ request: body });
  }

  parseResponseXml<T>(xml: string): BfApiResponse<T> {
    return this.parser.parse(xml) as BfApiResponse<T>;
  }

  async request<T>(
    endpoint: string,
    apiKey: string,
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const xmlBody = this.buildRequestXml(body);
    const authHeader = this.buildAuthHeader(apiKey);

    this.logger.debug('BlueFolder request', { endpoint });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization: authHeader,
        },
        body: xmlBody,
      });
    } catch (error) {
      throw new BlueFolderApiError(
        `Network error connecting to BlueFolder: ${(error as Error).message}`,
        'NETWORK_ERROR',
        503,
      );
    }

    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get('Retry-After') ?? '60',
        10,
      );
      throw new BlueFolderRateLimitError(
        'BlueFolder API rate limit exceeded',
        retryAfter,
      );
    }

    if (response.status === 401) {
      throw new BlueFolderApiError('Invalid BlueFolder API key', '401', 401);
    }

    if (!response.ok) {
      throw new BlueFolderApiError(
        `BlueFolder API returned HTTP ${response.status}`,
        String(response.status),
        response.status,
      );
    }

    const xmlText = await response.text();
    const parsed = this.parseResponseXml<T & { error?: BfApiError['error'] }>(
      xmlText,
    );

    if (parsed.response['@_status'] === 'fail') {
      const errorPayload = (
        parsed.response as unknown as { error: BfApiError['error'] }
      ).error;
      const errorCode = errorPayload?.['@_code'] ?? 'UNKNOWN';
      const errorMessage =
        errorPayload?.['#text'] ?? 'Unknown BlueFolder API error';

      throw new BlueFolderApiError(
        errorMessage,
        errorCode,
        parseInt(errorCode, 10) || 500,
      );
    }

    return parsed.response as unknown as T;
  }
}
