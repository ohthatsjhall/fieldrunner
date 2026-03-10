import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class LogContactAttemptDto {
  @IsUUID()
  vendorSearchResultId!: string;

  @IsIn(['no_answer', 'unavailable', 'declined'])
  status!: 'no_answer' | 'unavailable' | 'declined';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
