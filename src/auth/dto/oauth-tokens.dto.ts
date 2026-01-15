import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOrUpdateOAuthUserDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    example: 'ya29.a0AfH6SMBx...',
    description: 'Google OAuth access token'
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({ 
    example: '1//0gZ8xYz...',
    description: 'Google OAuth refresh token'
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class UpdateOAuthTokensDto {
  @ApiProperty({ 
    example: 'ya29.a0AfH6SMBx...',
    description: 'Google OAuth access token'
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({ 
    example: '1//0gZ8xYz...',
    required: false,
    description: 'Google OAuth refresh token (optional)'
  })
  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class OAuthUserResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string | null;

  @ApiProperty()
  googleAccessToken: string | null;

  @ApiProperty()
  googleRefreshToken: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}