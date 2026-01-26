import { IsEmail, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmailDto {
  @ApiProperty({ 
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;
}

export class CreatePhoneDto {
  @ApiProperty({ 
    description: 'Phone number in E.164 format',
    example: '+8801712345678'
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  phone: string;
}

export class CreateWhatsAppDto {
  @ApiProperty({ 
    description: 'WhatsApp number in E.164 format',
    example: '+8801712345678'
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'WhatsApp number must be in E.164 format (e.g., +1234567890)',
  })
  whatsappNumber: string;
}

export class UpdateEmailDto {
  @ApiProperty({ 
    description: 'Email address to update',
    example: 'newemail@example.com'
  })
  @IsEmail()
  email: string;
}

export class UpdatePhoneDto {
  @ApiProperty({ 
    description: 'Phone number to update in E.164 format',
    example: '+8801712345678'
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phone: string;
}

export class UpdateWhatsAppDto {
  @ApiProperty({ 
    description: 'WhatsApp number to update in E.164 format',
    example: '+8801712345678'
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'WhatsApp number must be in E.164 format',
  })
  whatsappNumber: string;
}