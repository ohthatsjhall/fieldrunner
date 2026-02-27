import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, CurrentOrg } from '../core/auth/decorators';
import type { AuthUser, AuthOrganization } from '@fieldrunner/shared';

@ApiTags('Debug')
@ApiBearerAuth()
@Controller('debug')
export class DebugController {
  @Get('me')
  @ApiOperation({ summary: 'Get current user and organization from JWT' })
  @ApiResponse({ status: 200, description: 'Current user and org context' })
  getMe(@CurrentUser() user: AuthUser, @CurrentOrg() org: AuthOrganization) {
    return {
      user,
      organization: org,
    };
  }

  @Get('auth')
  @ApiOperation({ summary: 'Get raw auth payload from request' })
  @ApiResponse({ status: 200, description: 'Raw auth object' })
  getAuth(@Req() req: Request) {
    return { auth: req.auth ?? null };
  }
}
