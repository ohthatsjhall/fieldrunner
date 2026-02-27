import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkService } from '../clerk.service';
import type { ClerkJwtPayload } from '../interfaces/clerk-payload.interface';

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;
  let clerkService: jest.Mocked<Pick<ClerkService, 'verifySessionToken'>>;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    clerkService = {
      verifySessionToken: jest.fn(),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new ClerkAuthGuard(
      clerkService as unknown as ClerkService,
      reflector as unknown as Reflector,
    );
  });

  function createMockContext(authHeader?: string): ExecutionContext {
    const request: Record<string, unknown> = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('should allow public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when no token present', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException for non-Bearer token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext('Basic abc123');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should verify token and attach auth to request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const mockPayload: ClerkJwtPayload = {
      sub: 'user_123',
      sid: 'sess_456',
      iss: 'https://test.clerk.accounts.dev',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      org_id: 'org_789',
      org_slug: 'test-org',
      org_role: 'org:member',
    };

    clerkService.verifySessionToken.mockResolvedValue(mockPayload);

    const mockRequest: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid-token' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(clerkService.verifySessionToken).toHaveBeenCalledWith('valid-token');
    expect(mockRequest['auth']).toEqual({
      userId: 'user_123',
      sessionId: 'sess_456',
      orgId: 'org_789',
      orgSlug: 'test-org',
      orgRole: 'org:member',
    });
  });

  it('should throw UnauthorizedException when token verification fails', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    clerkService.verifySessionToken.mockRejectedValue(
      new Error('Invalid token'),
    );

    const context = createMockContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
