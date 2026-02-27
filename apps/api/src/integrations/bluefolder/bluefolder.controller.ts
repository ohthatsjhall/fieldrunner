import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { BlueFolderService } from './bluefolder.service';
import { ServiceRequestsService } from './service-requests.service';

@Controller('bluefolder')
export class BlueFolderController {
  constructor(
    private readonly blueFolderService: BlueFolderService,
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Post('sync')
  sync(@CurrentOrg() org: AuthOrganization) {
    return this.serviceRequestsService.sync(org.orgId);
  }

  @Get('service-requests')
  listServiceRequests(@CurrentOrg() org: AuthOrganization) {
    return this.serviceRequestsService.findAll(org.orgId);
  }

  @Get('service-requests/:id')
  getServiceRequest(
    @CurrentOrg() org: AuthOrganization,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.blueFolderService.getServiceRequest(org.orgId, id);
  }

  @Get('stats')
  getStats(@CurrentOrg() org: AuthOrganization) {
    return this.serviceRequestsService.getStats(org.orgId);
  }

  @Get('sync-status')
  async getSyncStatus(@CurrentOrg() org: AuthOrganization) {
    const lastSyncedAt = await this.serviceRequestsService.getLastSyncedAt(
      org.orgId,
    );
    return { lastSyncedAt };
  }
}
