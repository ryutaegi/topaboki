import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CompleteGoogleRegistrationDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['user', 'admin'], { message: 'Role must be either user or admin' })
  role: string;

  @IsOptional()
  @IsString()
  affiliation?: string;

  @IsOptional()
  @IsString()
  disabilityType?: string;

  @IsOptional()
  @IsString()
  disabilityLevel?: string;
}
