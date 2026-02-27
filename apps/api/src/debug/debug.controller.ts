import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, CurrentOrg } from '../core/auth/decorators';
import type { AuthUser, AuthOrganization } from '@fieldrunner/shared';

@Controller('debug')
export class DebugController {
  @Get('me')
  getMe(@CurrentUser() user: AuthUser, @CurrentOrg() org: AuthOrganization) {
    return {
      user,
      organization: org,
    };
  }

  @Get('auth')
  getAuth(@Req() req: Request) {
    return { auth: req.auth ?? null };
  }
}
