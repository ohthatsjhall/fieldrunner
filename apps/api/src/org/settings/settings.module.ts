import { Module } from '@nestjs/common';
import { OrganizationSettingsController } from './settings.controller';
import { OrganizationSettingsService } from './settings.service';

@Module({
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService],
  exports: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
