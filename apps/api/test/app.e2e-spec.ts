import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import type { ClerkJwtPayload } from '../src/auth/interfaces/clerk-payload.interface';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const mockClerkService = {
    verifySessionToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClerkService)
      .useValue(mockClerkService)
      .compile();

    app = moduleFixture.createNestApplication();
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

  describe('GET /health', () => {
    it('should return 200 without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect((res.body as Record<string, unknown>).status).toBe('ok');
          expect((res.body as Record<string, unknown>).timestamp).toBeDefined();
        });
    });
  });

  describe('GET /debug/me', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/debug/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      mockClerkService.verifySessionToken.mockRejectedValue(
        new Error('Invalid'),
      );

      return request(app.getHttpServer())
        .get('/debug/me')
        .set('Authorization', 'Bearer bad-token')
        .expect(401);
    });

    it('should return 200 with valid token and org context', () => {
      const payload: ClerkJwtPayload = {
        sub: 'user_123',
        sid: 'sess_456',
        iss: 'https://test.clerk.accounts.dev',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        org_id: 'org_789',
        org_slug: 'test-org',
        org_role: 'org:admin',
      };

      mockClerkService.verifySessionToken.mockResolvedValue(payload);

      return request(app.getHttpServer())
        .get('/debug/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as {
            user: { userId: string };
            organization: { orgId: string };
          };
          expect(body.user.userId).toBe('user_123');
          expect(body.organization.orgId).toBe('org_789');
        });
    });

    it('should return 403 when token valid but no org context', () => {
      const payload: ClerkJwtPayload = {
        sub: 'user_123',
        sid: 'sess_456',
        iss: 'https://test.clerk.accounts.dev',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockClerkService.verifySessionToken.mockResolvedValue(payload);

      return request(app.getHttpServer())
        .get('/debug/me')
        .set('Authorization', 'Bearer valid-token-no-org')
        .expect(403);
    });
  });
});
