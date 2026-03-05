import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentOrg } from '../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Header('Cache-Control', 'private, max-age=120')
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '1m', '6m', '1y', 'all'],
    description: 'Time range filter for chart data',
  })
  @ApiResponse({ status: 200, description: 'Dashboard analytics payload' })
  getDashboard(
    @CurrentOrg() org: AuthOrganization,
    @Query('range') range?: string,
  ) {
    return this.analyticsService.getDashboard(org.orgId, range);
  }
}
