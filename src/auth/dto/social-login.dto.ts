import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

export class SocialLoginDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ 
    example: 'google',
    enum: SocialProvider,
    description: 'Social provider used for authentication'
  })
  @IsEnum(SocialProvider)
  @IsNotEmpty()
  provider: SocialProvider;

  @ApiProperty({ 
    example: '123456789',
    description: 'Unique ID from the social provider'
  })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({ 
    example: 'https://example.com/photo.jpg',
    required: false,
    description: 'Profile picture URL from social provider'
  })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ 
    example: 'fcm_token_here',
    required: false,
    description: 'Firebase Cloud Messaging token for push notifications'
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;
}

export class SocialAuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  user: {
    userId: string;
    email: string;
    fullName: string | null;
    role: string;
    profilePictureUrl: string | null;
  };

  @ApiProperty()
  isNewUser: boolean;
}