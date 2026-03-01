import { IsUUID } from 'class-validator';

export class LoadMoreVendorsDto {
  @IsUUID()
  sessionId!: string;
}
