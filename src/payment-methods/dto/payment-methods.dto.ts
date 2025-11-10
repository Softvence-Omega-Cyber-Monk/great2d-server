import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{13,19}$/, { message: 'Invalid card number' })
  cardNumber: string;

  @ApiProperty({ example: '12/25' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, {
    message: 'Invalid expiry date format (MM/YY)',
  })
  expiryDate: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,4}$/, { message: 'Invalid CVV' })
  cvv: string;

  @ApiProperty({ required: false, example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdatePaymentMethodDto extends PartialType(
  CreatePaymentMethodDto,
) {}

export class PaymentMethodResponseDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  cardHolderName: string;

  @ApiProperty()
  cardNumber: string;

  @ApiProperty()
  expiryDate: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}