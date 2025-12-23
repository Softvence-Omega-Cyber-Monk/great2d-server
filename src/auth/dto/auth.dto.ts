import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Length,
  Matches,
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

  @ApiProperty({ 
    example: 'fcm_token_here',
    required: false,
    description: 'Firebase Cloud Messaging token for push notifications'
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;
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

  @ApiProperty({ 
    example: 'fcm_token_here',
    required: false,
    description: 'Firebase Cloud Messaging token for push notifications'
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;
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

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  @Matches(/^\d{5}$/, { message: 'Code must be exactly 5 digits' })
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 5)
  @Matches(/^\d{5}$/, { message: 'Code must be exactly 5 digits' })
  code: string;

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