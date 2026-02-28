import { Module } from '@nestjs/common';
import { VendorSourcingController } from './vendor-sourcing.controller';
import { VendorSourcingService } from './vendor-sourcing.service';
import { GooglePlacesProvider } from './providers/google-places.provider';
import { BuildZoomProvider } from './providers/buildzoom.provider';
import { NominatimProvider } from './providers/nominatim.provider';
import { SearchQueryGeneratorService } from './providers/search-query-generator.service';
import { VendorScoringService } from './scoring/vendor-scoring.service';
import { TradeCategoriesService } from './trade-categories/trade-categories.service';
import { OrganizationSettingsModule } from '../../org/settings/settings.module';
import { BlueFolderModule } from '../bluefolder/bluefolder.module';

@Module({
  imports: [OrganizationSettingsModule, BlueFolderModule],
  controllers: [VendorSourcingController],
  providers: [
    VendorSourcingService,
    GooglePlacesProvider,
    BuildZoomProvider,
    NominatimProvider,
    SearchQueryGeneratorService,
    VendorScoringService,
    TradeCategoriesService,
  ],
})
export class VendorSourcingModule {}
