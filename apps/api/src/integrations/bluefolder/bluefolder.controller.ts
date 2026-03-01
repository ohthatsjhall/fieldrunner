import {
  Controller,
  Get,
  Header,
  Post,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { BlueFolderService } from './bluefolder.service';
import { BlueFolderUsersService } from './bluefolder-users.service';
import { ServiceRequestsService } from './service-requests.service';

@ApiTags('BlueFolder')
@ApiBearerAuth()
@Controller('bluefolder')
export class BlueFolderController {
  constructor(
    private readonly blueFolderService: BlueFolderService,
    private readonly usersService: BlueFolderUsersService,
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync service requests from BlueFolder' })
  @ApiResponse({ status: 201, description: 'Sync completed' })
  sync(@CurrentOrg() org: AuthOrganization) {
    return this.serviceRequestsService.sync(org.orgId);
  }

  @Post('sync-users')
  @ApiOperation({ summary: 'Sync users from BlueFolder' })
  @ApiResponse({ status: 201, description: 'User sync completed' })
  syncUsers(@CurrentOrg() org: AuthOrganization) {
    return this.usersService.sync(org.orgId);
  }

  @Get('service-requests')
  @Header('Cache-Control', 'private, max-age=120')
  @ApiOperation({ summary: 'List all synced service requests' })
  @ApiResponse({ status: 200, description: 'List of service requests' })
  listServiceRequests(@CurrentOrg() org: AuthOrganization) {
    return this.serviceRequestsService.findAll(org.orgId);
  }

  @Get('service-requests/:id')
  @ApiOperation({ summary: 'Get a service request by BlueFolder ID' })
  @ApiResponse({ status: 200, description: 'Service request detail' })
  getServiceRequest(
    @CurrentOrg() org: AuthOrganization,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.blueFolderService.getServiceRequest(org.orgId, id);
  }

  @Get('service-requests/:id/files')
  @ApiOperation({ summary: 'Get files attached to a service request' })
  @ApiResponse({ status: 200, description: 'List of attached files' })
  getServiceRequestFiles(
    @CurrentOrg() org: AuthOrganization,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.blueFolderService.getServiceRequestFiles(org.orgId, id);
  }

  @Get('stats')
  @Header('Cache-Control', 'private, max-age=120')
  @ApiOperation({ summary: 'Get service request statistics' })
  @ApiResponse({ status: 200, description: 'Aggregated stats' })
  getStats(@CurrentOrg() org: AuthOrganization) {
    return this.serviceRequestsService.getStats(org.orgId);
  }

  @Get('sync-status')
  @ApiOperation({ summary: 'Get the last sync timestamp' })
  @ApiResponse({ status: 200, description: 'Last synced timestamp' })
  async getSyncStatus(@CurrentOrg() org: AuthOrganization) {
    const lastSyncedAt = await this.serviceRequestsService.getLastSyncedAt(
      org.orgId,
    );
    return { lastSyncedAt };
  }
}
