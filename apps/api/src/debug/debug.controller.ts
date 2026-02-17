import { Controller, Get } from '@nestjs/common';
import { CurrentUser, CurrentOrg } from '../auth/decorators';
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
}
