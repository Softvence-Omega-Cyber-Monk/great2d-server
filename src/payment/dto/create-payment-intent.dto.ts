import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Payment amount in dollars',
    example: 29.99,
    minimum: 0.5,
  })
  @IsNumber()
  @Min(0.5)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'usd',
    default: 'usd',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;
}