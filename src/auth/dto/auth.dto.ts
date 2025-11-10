import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user: {
    userId: string;
    email: string;
    fullName: string | null;
    role: string;
  };
}