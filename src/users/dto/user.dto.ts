import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'John Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ required: false, example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    required: false,
    example: 'https://example.com/profile.jpg',
  })
  @IsUrl()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  isDarkMode?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  isNotificationsEnabled?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsBoolean()
  @IsOptional()
  isUsingBiometrics?: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string | null;

  @ApiProperty()
  phone: string | null;

  @ApiProperty()
  profilePictureUrl: string | null;

  @ApiProperty()
  isDarkMode: boolean;

  @ApiProperty()
  isNotificationsEnabled: boolean;

  @ApiProperty()
  isUsingBiometrics: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}