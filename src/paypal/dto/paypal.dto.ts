// paypal/dto/paypal.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { PayPalPaymentStatus } from 'generated/prisma';

export class CreatePayPalPaymentDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
    minimum: 0.01
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD'
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Subscription or service name',
    example: 'Netflix Premium Subscription'
  })
  @IsNotEmpty()
  @IsString()
  subscriptionName: string;
}

export class CapturePayPalPaymentDto {
  @ApiProperty({
    description: 'PayPal Order ID returned from create payment',
    example: '5O190127TN364715T'
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;
}

export class RefundPayPalPaymentDto {
  @ApiProperty({
    description: 'Payment ID to refund',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @ApiPropertyOptional({
    description: 'Refund amount (leave empty for full refund)',
    example: 50.00
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Reason for refund',
    example: 'Customer requested refund'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PayPalPaymentResponseDto {
  @ApiProperty({
    description: 'Payment record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId: string;

  @ApiProperty({
    description: 'PayPal Order ID',
    example: '5O190127TN364715T'
  })
  paypalOrderId: string;

  @ApiPropertyOptional({
    description: 'PayPal Payment/Capture ID',
    example: '8XY12345ABC67890D'
  })
  paypalPaymentId?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 99.99
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD'
  })
  currency: string;

  @ApiProperty({
    description: 'Subscription or service name',
    example: 'Netflix Premium Subscription'
  })
  subscriptionName: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PayPalPaymentStatus,
    example: PayPalPaymentStatus.completed
  })
  status: PayPalPaymentStatus;

  @ApiPropertyOptional({
    description: 'Payer email address',
    example: 'customer@example.com'
  })
  payerEmail?: string;

  @ApiPropertyOptional({
    description: 'Payer name',
    example: 'John Doe'
  })
  payerName?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:00:00.000Z'
  })
  updatedAt: Date;
}

export class PayPalOrderResponseDto {
  @ApiProperty({
    description: 'PayPal Order ID',
    example: '5O190127TN364715T'
  })
  orderId: string;

  @ApiProperty({
    description: 'Approval URL for user to complete payment',
    example: 'https://www.paypal.com/checkoutnow?token=5O190127TN364715T'
  })
  approvalUrl: string;

  @ApiProperty({
    description: 'Payment record ID in our database',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  paymentId: string;
}

export class PayPalWebhookDto {
  @ApiProperty({
    description: 'Event type',
    example: 'PAYMENT.CAPTURE.COMPLETED'
  })
  event_type: string;

  @ApiProperty({
    description: 'Resource data'
  })
  resource: any;

  @ApiPropertyOptional({
    description: 'Event ID'
  })
  id?: string;
}