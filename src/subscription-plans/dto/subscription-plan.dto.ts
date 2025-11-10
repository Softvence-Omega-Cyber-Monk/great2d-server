import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
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

  @ApiProperty({ example: '1 month' })
  @IsString()
  @IsNotEmpty()
  duration: string;

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
  duration: string;

  @ApiProperty({ type: [String] })
  features: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SubscribeDto {
  @ApiProperty({ example: 'subscription-plan-id' })
  @IsString()
  @IsNotEmpty()
  subscriptionPlanId: string;
}