import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 1, description: 'Duration in months' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  duration: number;

  @ApiProperty({
    example: ['Feature 1', 'Feature 2', 'Feature 3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];
}

export class UpdateSubscriptionPlanDto extends PartialType(
  CreateSubscriptionPlanDto,
) {}

export class SubscriptionPlanResponseDto {
  @ApiProperty()
  subscriptionPlanId: string;

  @ApiProperty()
  planName: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  duration: number;

  @ApiProperty({ type: [String] })
  features: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SubscribeDto {
  @ApiProperty({ example: 'user-id-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'subscription-plan-id-uuid' })
  @IsString()
  @IsNotEmpty()
  subscriptionPlanId: string;

  @ApiProperty({ example: 'TXN123456789' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ example: '2025-01-10T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  createdAt: string;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  subscriptionId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  subscriptionPlanId: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  subscriptionPlan: {
    planName: string;
    price: number;
    duration: number;
  };
}