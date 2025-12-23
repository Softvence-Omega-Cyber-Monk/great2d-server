import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum NotificationType {
  BILL_STATUS_CHANGE = 'bill_status_change',
  PAYMENT_REMINDER = 'payment_reminder',
  SAVINGS_MILESTONE = 'savings_milestone',
  GENERAL = 'general',
  SYSTEM = 'system',
}

export class CreateNotificationDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Negotiation Successful' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your bill negotiation with Comcast was successful!' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ 
    example: NotificationType.BILL_STATUS_CHANGE, 
    enum: NotificationType 
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ example: 'bill-uuid-here' })
  @IsUUID()
  @IsOptional()
  billId?: string;

  @ApiPropertyOptional({ 
    example: { oldStatus: 'sent', newStatus: 'successful' },
    description: 'Additional metadata as JSON'
  })
  @IsOptional()
  data?: any;
}

export class MarkNotificationAsReadDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isRead: boolean;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  billId?: string;

  @ApiPropertyOptional()
  data?: any;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  readAt?: Date;
}