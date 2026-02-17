import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { WebhooksService } from '../src/webhooks/webhooks.service';

describe('Webhooks (e2e)', () => {
  let app: INestApplication<App>;

  const mockClerkService = {
    verifySessionToken: jest.fn(),
  };

  const mockWebhooksService = {
    verifyWebhook: jest.fn(),
    logEvent: jest.fn(),
    processEvent: jest.fn(),
    markProcessed: jest.fn(),
    markFailed: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClerkService)
      .useValue(mockClerkService)
      .overrideProvider(WebhooksService)
      .useValue(mockWebhooksService)
      .compile();

    app = moduleFixture.createNestApplication({
      rawBody: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /webhooks', () => {
    const validHeaders = {
      'svix-id': 'msg_test_abc123',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,abc123signaturevalue',
    };

    const validPayload = {
      type: 'user.created',
      data: {
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
      },
    };

    it('should return 400 without svix headers', () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);

      return request(app.getHttpServer())
        .post('/webhooks')
        .send(validPayload)
        .expect(400)
        .expect((res: request.Response) => {
          expect((res.body as Record<string, unknown>).message).toBe(
            'Missing required webhook headers',
          );
        });
    });

    it('should return 400 when svix-id header is missing', () => {
      return request(app.getHttpServer())
        .post('/webhooks')
        .set('svix-timestamp', '1700000000')
        .set('svix-signature', 'v1,abc123')
        .send(validPayload)
        .expect(400)
        .expect((res: request.Response) => {
          expect((res.body as Record<string, unknown>).message).toBe(
            'Missing required webhook headers',
          );
        });
    });

    it('should return 400 when svix-timestamp header is missing', () => {
      return request(app.getHttpServer())
        .post('/webhooks')
        .set('svix-id', 'msg_test_abc123')
        .set('svix-signature', 'v1,abc123')
        .send(validPayload)
        .expect(400)
        .expect((res: request.Response) => {
          expect((res.body as Record<string, unknown>).message).toBe(
            'Missing required webhook headers',
          );
        });
    });

    it('should return 400 when svix-signature header is missing', () => {
      return request(app.getHttpServer())
        .post('/webhooks')
        .set('svix-id', 'msg_test_abc123')
        .set('svix-timestamp', '1700000000')
        .send(validPayload)
        .expect(400)
        .expect((res: request.Response) => {
          expect((res.body as Record<string, unknown>).message).toBe(
            'Missing required webhook headers',
          );
        });
    });

    it('should return 400 with invalid signature', () => {
      mockWebhooksService.verifyWebhook.mockImplementation(() => {
        const { BadRequestException } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('@nestjs/common') as typeof import('@nestjs/common');
        throw new BadRequestException('Invalid webhook signature');
      });

      return request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(400)
        .expect((res: request.Response) => {
          expect((res.body as Record<string, unknown>).message).toBe(
            'Invalid webhook signature',
          );
        });
    });

    it('should return 200 with "processed" status for valid new event', () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true);
      mockWebhooksService.processEvent.mockResolvedValue(undefined);
      mockWebhooksService.markProcessed.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as { status: string; clerkEventId: string };
          expect(body.status).toBe('processed');
          expect(body.clerkEventId).toBe('msg_test_abc123');
        });
    });

    it('should return 200 with "duplicate" status for duplicate event', () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(false); // duplicate

      return request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as { status: string; clerkEventId: string };
          expect(body.status).toBe('duplicate');
          expect(body.clerkEventId).toBe('msg_test_abc123');
        });
    });

    it('should not call processEvent for duplicate events', async () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200);

      expect(mockWebhooksService.processEvent).not.toHaveBeenCalled();
    });

    it('should return 5xx on retryable errors (referenced entity not found)', async () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true);
      mockWebhooksService.processEvent.mockRejectedValue(
        new Error(
          'Referenced entity not found: org=false, user=true (orgClerkId=org_123, userClerkId=user_456)',
        ),
      );
      mockWebhooksService.markFailed.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload);

      expect(res.status).toBeGreaterThanOrEqual(500);
    });

    it('should return 200 with "failed" status on non-retryable errors', () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true);
      mockWebhooksService.processEvent.mockRejectedValue(
        new Error('Some unexpected non-retryable error'),
      );
      mockWebhooksService.markFailed.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as {
            status: string;
            clerkEventId: string;
            error: string;
          };
          expect(body.status).toBe('failed');
          expect(body.error).toBe('Some unexpected non-retryable error');
        });
    });

    it('should call markProcessed after successful processing', async () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true);
      mockWebhooksService.processEvent.mockResolvedValue(undefined);
      mockWebhooksService.markProcessed.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200);

      expect(mockWebhooksService.markProcessed).toHaveBeenCalledWith(
        'msg_test_abc123',
      );
    });

    it('should call markFailed when processing throws', async () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true);
      mockWebhooksService.processEvent.mockRejectedValue(
        new Error('Processing failure'),
      );
      mockWebhooksService.markFailed.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200);

      expect(mockWebhooksService.markFailed).toHaveBeenCalledWith(
        'msg_test_abc123',
        'Processing failure',
      );
    });

    it('should return 200 with "processed" status when retrying a previously failed event', async () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true); // reprocess (was unprocessed)
      mockWebhooksService.processEvent.mockResolvedValue(undefined);
      mockWebhooksService.markProcessed.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200);

      const body = res.body as { status: string; clerkEventId: string };
      expect(body.status).toBe('processed');
      expect(body.clerkEventId).toBe('msg_test_abc123');
      expect(mockWebhooksService.processEvent).toHaveBeenCalled();
      expect(mockWebhooksService.markProcessed).toHaveBeenCalledWith(
        'msg_test_abc123',
      );
    });

    it('should pass svix headers to verifyWebhook', async () => {
      mockWebhooksService.verifyWebhook.mockReturnValue(validPayload);
      mockWebhooksService.logEvent.mockResolvedValue(true);
      mockWebhooksService.processEvent.mockResolvedValue(undefined);
      mockWebhooksService.markProcessed.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/webhooks')
        .set(validHeaders)
        .send(validPayload)
        .expect(200);

      expect(mockWebhooksService.verifyWebhook).toHaveBeenCalledWith(
        expect.any(Buffer),
        {
          'svix-id': 'msg_test_abc123',
          'svix-timestamp': '1700000000',
          'svix-signature': 'v1,abc123signaturevalue',
        },
      );
    });
  });
});
