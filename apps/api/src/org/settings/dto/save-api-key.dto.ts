import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SaveApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  apiKey!: string;
}
