import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

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
