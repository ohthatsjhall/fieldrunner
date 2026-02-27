import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClerkService } from '../clerk.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly clerkService: ClerkService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.clerkService.verifySessionToken(token);

      const orgId = payload.org_id ?? payload.o?.id;
      const orgSlug = payload.org_slug ?? payload.o?.slg;
      const orgRole = payload.org_role ?? payload.o?.rol;

      request.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
        orgId,
        orgSlug,
        orgRole,
      };

      this.logger.debug(
        `Auth resolved | user=${payload.sub} org=${orgId ?? 'MISSING'} slug=${orgSlug ?? 'MISSING'}`,
      );

      return true;
    } catch (error) {
      this.logger.warn('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
