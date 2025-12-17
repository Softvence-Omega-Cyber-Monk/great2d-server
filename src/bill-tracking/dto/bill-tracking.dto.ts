// bill-tracking.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { BillCategory, BillPaymentStatus } from 'generated/prisma';

export class CreateBillTrackingDto {
  @ApiProperty({
    description: 'ID of the bill to track',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  billId: string;

  @ApiProperty({
    description: 'Month for tracking (YYYY-MM format)',
    example: '2024-01'
  })
  @IsNotEmpty()
  @IsString()
  month: string;

  @ApiProperty({
    description: 'Due date for the bill payment',
    example: '2024-01-15T00:00:00.000Z'
  })
  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({
    description: 'Bill amount',
    example: 150.50
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}

export class UpdateBillTrackingDto {
  @ApiPropertyOptional({
    description: 'Payment status of the bill',
    enum: BillPaymentStatus,
    example: BillPaymentStatus.paid
  })
  @IsOptional()
  @IsEnum(BillPaymentStatus)
  paymentStatus?: BillPaymentStatus;

  @ApiPropertyOptional({
    description: 'Date when the bill was paid',
    example: '2024-01-10T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Updated bill amount',
    example: 175.00
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated due date',
    example: '2024-01-20T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class BillTrackingResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the bill tracking record',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the associated bill',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  billId: string;

  @ApiProperty({
    description: 'Month of tracking',
    example: '2024-01-01T00:00:00.000Z'
  })
  month: Date;

  @ApiProperty({
    description: 'Name of the bill',
    example: 'Internet Bill'
  })
  billName: string;

  @ApiProperty({
    description: 'Category of the bill',
    enum: BillCategory,
    example: BillCategory.internet
  })
  category: BillCategory;

  @ApiProperty({
    description: 'Service provider name',
    example: 'Comcast'
  })
  provider: string;

  @ApiProperty({
    description: 'Bill amount',
    example: 150.50
  })
  amount: number;

  @ApiProperty({
    description: 'Due date for payment',
    example: '2024-01-15T00:00:00.000Z'
  })
  dueDate: Date;

  @ApiProperty({
    description: 'Payment status',
    enum: BillPaymentStatus,
    example: BillPaymentStatus.due
  })
  paymentStatus: BillPaymentStatus;

  @ApiPropertyOptional({
    description: 'Date when the bill was paid',
    example: '2024-01-10T00:00:00.000Z'
  })
  paidAt?: Date;

  @ApiProperty({
    description: 'ID of the user',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-10T00:00:00.000Z'
  })
  updatedAt: Date;
}

export class MonthlyBillSummaryDto {
  @ApiProperty({
    description: 'Month of the summary',
    example: '2024-01'
  })
  month: string;

  @ApiProperty({
    description: 'Total number of bills',
    example: 5
  })
  totalBills: number;

  @ApiProperty({
    description: 'Number of paid bills',
    example: 3
  })
  paidBills: number;

  @ApiProperty({
    description: 'Number of due bills',
    example: 1
  })
  dueBills: number;

  @ApiProperty({
    description: 'Number of overdue bills',
    example: 1
  })
  overdueBills: number;

  @ApiProperty({
    description: 'Total amount of all bills',
    example: 750.00
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Total amount paid',
    example: 450.00
  })
  paidAmount: number;

  @ApiProperty({
    description: 'Total amount still due',
    example: 300.00
  })
  dueAmount: number;
}