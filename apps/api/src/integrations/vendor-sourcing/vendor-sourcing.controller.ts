import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { VendorSourcingService } from './vendor-sourcing.service';
import { TradeCategoriesService } from './trade-categories/trade-categories.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { SearchVendorsDto } from './dto/search-vendors.dto';

@Controller('vendor-sourcing')
export class VendorSourcingController {
  constructor(
    private readonly vendorSourcingService: VendorSourcingService,
    private readonly tradeCategoriesService: TradeCategoriesService,
    private readonly settingsService: OrganizationSettingsService,
  ) {}

  @Post('search')
  search(
    @CurrentOrg() org: AuthOrganization,
    @Body() dto: SearchVendorsDto,
  ) {
    return this.vendorSourcingService.search(org.orgId, dto);
  }

  @Get('sessions')
  async listSessions(@CurrentOrg() org: AuthOrganization) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    return this.vendorSourcingService.listSessions(organizationId);
  }

  @Get('sessions/:id')
  getSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorSourcingService.getSession(id);
  }

  @Get('vendors/:id')
  getVendorDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorSourcingService.getVendorDetail(id);
  }

  @Get('trade-categories')
  async listTradeCategories(@CurrentOrg() org: AuthOrganization) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    return this.tradeCategoriesService.findAll(organizationId);
  }

  @Post('trade-categories')
  async createTradeCategory(@CurrentOrg() org: AuthOrganization) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    // Seed defaults first (idempotent)
    await this.tradeCategoriesService.seedDefaults(organizationId);
    return this.tradeCategoriesService.findAll(organizationId);
  }
}
