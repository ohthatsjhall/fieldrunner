import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { BlueFolderController } from './bluefolder.controller';
import { BlueFolderService } from './bluefolder.service';
import { BlueFolderClientService } from './bluefolder-client.service';
import { BlueFolderExceptionFilter } from './bluefolder-exception.filter';
import { BlueFolderUsersService } from './bluefolder-users.service';
import { ServiceRequestsService } from './service-requests.service';
import { OrganizationSettingsModule } from '../../org/settings/settings.module';

@Module({
  imports: [OrganizationSettingsModule],
  controllers: [BlueFolderController],
  providers: [
    BlueFolderService,
    BlueFolderClientService,
    BlueFolderUsersService,
    ServiceRequestsService,
    {
      provide: APP_FILTER,
      useClass: BlueFolderExceptionFilter,
    },
  ],
})
export class BlueFolderModule {}
