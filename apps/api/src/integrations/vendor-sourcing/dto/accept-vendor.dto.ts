import { IsInt, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class AcceptVendorDto {
  @IsUUID()
  vendorId!: string;

  @IsInt()
  serviceRequestBluefolderId!: number;

  @IsUUID()
  @IsOptional()
  searchSessionId?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  rank?: number;

  @IsNumber()
  @IsOptional()
  score?: number;
}
