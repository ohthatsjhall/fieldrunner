import { Controller, Get, Put, Delete, Body, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentOrg } from '../../core/auth/decorators';
import type { AuthOrganization } from '@fieldrunner/shared';
import { OrganizationSettingsService } from './settings.service';
import { SaveApiKeyDto } from './dto';

@ApiTags('Organization Settings')
@ApiBearerAuth()
@Controller('organization-settings')
export class OrganizationSettingsController {
  constructor(private readonly settingsService: OrganizationSettingsService) {}

  @Get('bluefolder-api-key')
  @ApiOperation({
    summary: 'Get BlueFolder API key status for the organization',
  })
  @ApiResponse({ status: 200, description: 'API key settings retrieved' })
  getSettings(@CurrentOrg() org: AuthOrganization) {
    return this.settingsService.getSettings(org.orgId);
  }

  @Put('bluefolder-api-key')
  @ApiOperation({ summary: 'Save or update the BlueFolder API key' })
  @ApiResponse({ status: 200, description: 'API key saved' })
  saveApiKey(@CurrentOrg() org: AuthOrganization, @Body() dto: SaveApiKeyDto) {
    return this.settingsService.saveApiKey(org.orgId, dto.apiKey);
  }

  @Delete('bluefolder-api-key')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the BlueFolder API key' })
  @ApiResponse({ status: 204, description: 'API key deleted' })
  deleteApiKey(@CurrentOrg() org: AuthOrganization) {
    return this.settingsService.deleteApiKey(org.orgId);
  }
}
