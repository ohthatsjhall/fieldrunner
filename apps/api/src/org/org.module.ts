import { Module } from '@nestjs/common';
import { OrganizationSettingsModule } from './settings/settings.module';

@Module({
  imports: [OrganizationSettingsModule],
  exports: [OrganizationSettingsModule],
})
export class OrgModule {}
