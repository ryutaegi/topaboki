import { IsString, IsNotEmpty, IsOptional, MinLength, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SimpleStepDto {
  @IsArray()
  @IsString({ each: true })
  imageUrls: string[];

  @IsString()
  description: string;
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => SimpleStepDto)
  steps?: Record<string, SimpleStepDto[]>;
}