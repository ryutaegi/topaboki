import { IsArray, IsString, IsOptional } from 'class-validator';

export class UploadClassificationImagesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  normalImages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  abnormalImages?: string[];
}