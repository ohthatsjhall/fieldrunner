import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from './clerk.service';
import type { ClerkJwtPayload } from './interfaces/clerk-payload.interface';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from '@clerk/backend';

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('ClerkService', () => {
  let service: ClerkService;

  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      const vals: Record<string, string> = {
        CLERK_SECRET_KEY: 'sk_test_xxx',
        CLERK_PUBLISHABLE_KEY: 'pk_test_xxx',
      };
      return vals[key];
    }),
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ClerkService>(ClerkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify a valid token and return the payload', async () => {
    const mockPayload: ClerkJwtPayload = {
      sub: 'user_123',
      sid: 'sess_456',
      iss: 'https://test.clerk.accounts.dev',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      org_id: 'org_789',
      org_slug: 'my-org',
      org_role: 'org:admin',
    };

    mockVerifyToken.mockResolvedValueOnce(
      mockPayload as unknown as Awaited<ReturnType<typeof verifyToken>>,
    );

    const result = await service.verifySessionToken('test-token');

    expect(mockVerifyToken).toHaveBeenCalledWith('test-token', {
      secretKey: 'sk_test_xxx',
    });
    expect(result.sub).toBe('user_123');
    expect(result.org_id).toBe('org_789');
  });

  it('should throw when verifyToken rejects', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('Token expired'));

    await expect(service.verifySessionToken('bad-token')).rejects.toThrow(
      'Token expired',
    );
  });
});
