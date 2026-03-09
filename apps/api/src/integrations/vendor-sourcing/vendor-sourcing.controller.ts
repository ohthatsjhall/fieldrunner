import {
  Controller,
  Get,
  Header,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { VendorSourcingService } from './vendor-sourcing.service';
import { TradeCategoriesService } from './trade-categories/trade-categories.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { SearchVendorsDto } from './dto/search-vendors.dto';
import { AcceptVendorDto } from './dto/accept-vendor.dto';

@ApiTags('Vendor Sourcing')
@ApiBearerAuth()
@Controller('vendor-sourcing')
export class VendorSourcingController {
  constructor(
    private readonly vendorSourcingService: VendorSourcingService,
    private readonly tradeCategoriesService: TradeCategoriesService,
    private readonly settingsService: OrganizationSettingsService,
  ) {}

  @Post('search')
  @ApiOperation({ summary: 'Search for vendors by trade and location' })
  @ApiResponse({
    status: 201,
    description: 'Search results with scored vendors',
  })
  search(@CurrentOrg() org: AuthOrganization, @Body() dto: SearchVendorsDto) {
    return this.vendorSourcingService.search(org.orgId, dto);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get vendor search results for a service request' })
  @ApiResponse({ status: 200, description: 'Search results or null if none' })
  async getResultsByServiceRequest(
    @CurrentOrg() org: AuthOrganization,
    @Query('serviceRequestBluefolderId', ParseIntPipe) bluefolderId: number,
  ) {
    return this.vendorSourcingService.getResultsByServiceRequest(
      org.orgId,
      bluefolderId,
    );
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept a vendor for a service request' })
  @ApiResponse({ status: 201, description: 'Vendor assignment created' })
  acceptVendor(
    @CurrentOrg() org: AuthOrganization,
    @Body() dto: AcceptVendorDto,
  ) {
    return this.vendorSourcingService.acceptVendor(org.orgId, dto);
  }

  @Get('assignment')
  @ApiOperation({ summary: 'Get vendor assignment for a service request' })
  @ApiResponse({ status: 200, description: 'Vendor assignment or null' })
  getAssignment(
    @CurrentOrg() org: AuthOrganization,
    @Query('serviceRequestBluefolderId', ParseIntPipe) bluefolderId: number,
  ) {
    return this.vendorSourcingService.getAssignment(org.orgId, bluefolderId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List all vendor search sessions' })
  @ApiResponse({ status: 200, description: 'List of search sessions' })
  async listSessions(@CurrentOrg() org: AuthOrganization) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    return this.vendorSourcingService.listSessions(organizationId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a vendor search session by ID' })
  @ApiResponse({ status: 200, description: 'Search session detail' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @CurrentOrg() org: AuthOrganization,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    const session = await this.vendorSourcingService.getSession(
      organizationId,
      id,
    );
    if (!session) throw new NotFoundException(`Search session ${id} not found`);
    return session;
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get detailed info for a specific vendor' })
  @ApiResponse({ status: 200, description: 'Vendor detail' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getVendorDetail(
    @CurrentOrg() org: AuthOrganization,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    const vendor = await this.vendorSourcingService.getVendorDetail(
      organizationId,
      id,
    );
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  @Get('trade-categories')
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({ summary: 'List trade categories for the organization' })
  @ApiResponse({ status: 200, description: 'List of trade categories' })
  async listTradeCategories(@CurrentOrg() org: AuthOrganization) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    return this.tradeCategoriesService.findAll(organizationId);
  }

  @Post('trade-categories')
  @ApiOperation({
    summary: 'Seed default trade categories for the organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Trade categories seeded and returned',
  })
  async createTradeCategory(@CurrentOrg() org: AuthOrganization) {
    const organizationId = await this.settingsService.resolveOrgId(org.orgId);
    // Seed defaults first (idempotent)
    await this.tradeCategoriesService.seedDefaults(organizationId);
    return this.tradeCategoriesService.findAll(organizationId);
  }
}
