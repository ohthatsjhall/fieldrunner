import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class SearchVendorsDto {
  @IsInt()
  @IsOptional()
  serviceRequestBluefolderId?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  tradeCategory?: string;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(100000)
  radiusMeters?: number;
}
