import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { BlueFolderService } from './bluefolder.service';
import { ListServiceRequestsDto } from './dto';

@Controller('bluefolder')
export class BlueFolderController {
  constructor(private readonly blueFolderService: BlueFolderService) {}

  @Get('service-requests')
  listServiceRequests(
    @CurrentOrg() org: AuthOrganization,
    @Query() filters: ListServiceRequestsDto,
  ) {
    return this.blueFolderService.listServiceRequests(org.orgId, filters);
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
    return this.blueFolderService.getStats(org.orgId);
  }
}
