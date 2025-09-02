import { IsString, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SimpleStepDto {
  @IsArray()
  @IsString({ each: true })
  imageUrls: string[];

  @IsString()
  description: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => SimpleStepDto)
  steps?: Record<string, SimpleStepDto[]>;
}