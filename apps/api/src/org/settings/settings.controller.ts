import { Controller, Get, Put, Delete, Body, HttpCode } from '@nestjs/common';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { OrganizationSettingsService } from './settings.service';
import { SaveApiKeyDto } from './dto';

@Controller('organization-settings')
export class OrganizationSettingsController {
  constructor(private readonly settingsService: OrganizationSettingsService) {}

  @Get('bluefolder-api-key')
  getSettings(@CurrentOrg() org: AuthOrganization) {
    return this.settingsService.getSettings(org.orgId);
  }

  @Put('bluefolder-api-key')
  saveApiKey(@CurrentOrg() org: AuthOrganization, @Body() dto: SaveApiKeyDto) {
    return this.settingsService.saveApiKey(org.orgId, dto.apiKey);
  }

  @Delete('bluefolder-api-key')
  @HttpCode(204)
  deleteApiKey(@CurrentOrg() org: AuthOrganization) {
    return this.settingsService.deleteApiKey(org.orgId);
  }
}
