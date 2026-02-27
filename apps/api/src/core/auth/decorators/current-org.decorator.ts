import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthOrganization } from '@fieldrunner/shared';

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthOrganization => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const { auth } = request;

    if (!auth?.orgId) {
      throw new ForbiddenException(
        'Organization membership required. Please select an organization.',
      );
    }

    return {
      orgId: auth.orgId,
      orgSlug: auth.orgSlug ?? '',
      orgRole: auth.orgRole ?? '',
    };
  },
);
