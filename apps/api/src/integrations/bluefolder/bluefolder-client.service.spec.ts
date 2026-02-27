import { Test, TestingModule } from '@nestjs/testing';
import {
  BlueFolderClientService,
  BlueFolderApiError,
  BlueFolderRateLimitError,
} from './bluefolder-client.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function xmlResponse(status: 'ok' | 'fail', body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?><response status="${status}">${body}</response>`;
}

function fetchOk(xml: string) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: () => Promise.resolve(xml),
  };
}

describe('BlueFolderClientService', () => {
  let service: BlueFolderClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlueFolderClientService],
    }).compile();

    service = module.get(BlueFolderClientService);
    mockFetch.mockReset();
  });

  describe('buildAuthHeader', () => {
    it('should encode apiKey:X as Base64 Basic auth', () => {
      const header = service.buildAuthHeader('test-api-key');
      const expected = `Basic ${Buffer.from('test-api-key:X').toString('base64')}`;
      expect(header).toBe(expected);
    });

    it('should handle special characters in API key', () => {
      const header = service.buildAuthHeader('key+with/special=chars');
      const decoded = Buffer.from(
        header.replace('Basic ', ''),
        'base64',
      ).toString('utf8');
      expect(decoded).toBe('key+with/special=chars:X');
    });
  });

  describe('buildRequestXml', () => {
    it('should wrap body in <request> tags', () => {
      const xml = service.buildRequestXml({ listType: 'basic' });
      expect(xml).toContain('<request>');
      expect(xml).toContain('<listType>basic</listType>');
      expect(xml).toContain('</request>');
    });

    it('should handle nested objects', () => {
      const xml = service.buildRequestXml({
        dateRange: {
          '@_dateField': 'dateTimeCreated',
          startDate: '01-01-2024',
          endDate: '12-31-2024',
        },
      });
      expect(xml).toContain('dateField="dateTimeCreated"');
      expect(xml).toContain('<startDate>01-01-2024</startDate>');
    });

    it('should handle empty body', () => {
      const xml = service.buildRequestXml({});
      expect(xml).toContain('<request>');
      expect(xml).toContain('</request>');
    });
  });

  describe('parseResponseXml', () => {
    it('should parse a success response', () => {
      const xml = xmlResponse(
        'ok',
        '<serviceRequestList><serviceRequest><serviceRequestId>123</serviceRequestId></serviceRequest></serviceRequestList>',
      );
      const result = service.parseResponseXml(xml);
      expect(result.response['@_status']).toBe('ok');
    });

    it('should force arrays for known collection tags', () => {
      const xml = xmlResponse(
        'ok',
        '<serviceRequestList><serviceRequest><serviceRequestId>123</serviceRequestId></serviceRequest></serviceRequestList>',
      );
      const result = service.parseResponseXml<{
        serviceRequestList: {
          serviceRequest: Array<{ serviceRequestId: number }>;
        };
      }>(xml);
      expect(
        Array.isArray(result.response.serviceRequestList.serviceRequest),
      ).toBe(true);
    });

    it('should parse error response with CDATA', () => {
      const xml = xmlResponse(
        'fail',
        '<error code="429"><![CDATA[Rate limit exceeded. Please retry after 60 seconds.]]></error>',
      );
      const result = service.parseResponseXml(xml);
      expect(result.response['@_status']).toBe('fail');
    });
  });

  describe('request', () => {
    const apiKey = 'test-key-123';
    const endpoint = 'serviceRequests/list.aspx';

    it('should make a POST request to the correct URL', async () => {
      const xml = xmlResponse(
        'ok',
        '<serviceRequestList><serviceRequest><serviceRequestId>1</serviceRequestId></serviceRequest></serviceRequestList>',
      );
      mockFetch.mockResolvedValueOnce(fetchOk(xml));

      await service.request(endpoint, apiKey, { listType: 'basic' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.bluefolder.com/api/2.0/serviceRequests/list.aspx',
        expect.objectContaining({
          method: 'POST',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
            Authorization: service.buildAuthHeader(apiKey),
          }),
        }),
      );
    });

    it('should send XML body with request wrapper', async () => {
      const xml = xmlResponse('ok', '<result>done</result>');
      mockFetch.mockResolvedValueOnce(fetchOk(xml));

      await service.request(endpoint, apiKey, { listType: 'basic' });

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = callArgs[1].body as string;
      expect(body).toContain('<request>');
      expect(body).toContain('<listType>basic</listType>');
    });

    it('should return parsed response body on success', async () => {
      const xml = xmlResponse(
        'ok',
        '<serviceRequestList><serviceRequest><serviceRequestId>42</serviceRequestId><description>Test SR</description></serviceRequest></serviceRequestList>',
      );
      mockFetch.mockResolvedValueOnce(fetchOk(xml));

      const result = await service.request<{
        serviceRequestList: {
          serviceRequest: Array<{
            serviceRequestId: number;
            description: string;
          }>;
        };
      }>(endpoint, apiKey);

      expect(result.serviceRequestList.serviceRequest[0].serviceRequestId).toBe(
        42,
      );
      expect(result.serviceRequestList.serviceRequest[0].description).toBe(
        'Test SR',
      );
    });

    it('should throw BlueFolderRateLimitError on 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
        text: () => Promise.resolve(''),
      });

      await expect(service.request(endpoint, apiKey)).rejects.toThrow(
        BlueFolderRateLimitError,
      );

      try {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '30' }),
          text: () => Promise.resolve(''),
        });
        await service.request(endpoint, apiKey);
      } catch (error) {
        expect(error).toBeInstanceOf(BlueFolderRateLimitError);
        expect((error as BlueFolderRateLimitError).retryAfterSeconds).toBe(30);
      }
    });

    it('should default Retry-After to 60 when header is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      try {
        await service.request(endpoint, apiKey);
      } catch (error) {
        expect((error as BlueFolderRateLimitError).retryAfterSeconds).toBe(60);
      }
    });

    it('should throw BlueFolderApiError on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      await expect(service.request(endpoint, apiKey)).rejects.toThrow(
        BlueFolderApiError,
      );

      try {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        });
        await service.request(endpoint, apiKey);
      } catch (error) {
        expect((error as BlueFolderApiError).statusCode).toBe(401);
        expect((error as BlueFolderApiError).message).toContain(
          'Invalid BlueFolder API key',
        );
      }
    });

    it('should throw BlueFolderApiError on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: () => Promise.resolve(''),
      });

      await expect(service.request(endpoint, apiKey)).rejects.toThrow(
        BlueFolderApiError,
      );
    });

    it('should throw BlueFolderApiError on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(service.request(endpoint, apiKey)).rejects.toThrow(
        BlueFolderApiError,
      );

      try {
        mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        await service.request(endpoint, apiKey);
      } catch (error) {
        expect((error as BlueFolderApiError).code).toBe('NETWORK_ERROR');
        expect((error as BlueFolderApiError).statusCode).toBe(503);
      }
    });

    it('should throw BlueFolderApiError on API-level error response', async () => {
      const xml = xmlResponse(
        'fail',
        '<error code="500">Internal server error</error>',
      );
      mockFetch.mockResolvedValueOnce(fetchOk(xml));

      await expect(service.request(endpoint, apiKey)).rejects.toThrow(
        BlueFolderApiError,
      );

      try {
        mockFetch.mockResolvedValueOnce(fetchOk(xml));
        await service.request(endpoint, apiKey);
      } catch (error) {
        expect((error as BlueFolderApiError).code).toBe('500');
        expect((error as BlueFolderApiError).message).toBe(
          'Internal server error',
        );
      }
    });

    it('should handle CDATA-wrapped error messages', async () => {
      const xml = xmlResponse(
        'fail',
        '<error code="429"><![CDATA[Rate limit exceeded. Please retry.]]></error>',
      );
      mockFetch.mockResolvedValueOnce(fetchOk(xml));

      try {
        await service.request(endpoint, apiKey);
      } catch (error) {
        expect((error as BlueFolderApiError).message).toContain(
          'Rate limit exceeded',
        );
      }
    });

    it('should handle empty request body', async () => {
      const xml = xmlResponse('ok', '<result>done</result>');
      mockFetch.mockResolvedValueOnce(fetchOk(xml));

      await service.request(endpoint, apiKey);

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = callArgs[1].body as string;
      expect(body).toContain('<request>');
    });
  });
});
