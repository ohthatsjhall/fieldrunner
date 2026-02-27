import { IsOptional, IsString } from 'class-validator';

export class ListServiceRequestsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  billingStatus?: string;
}
