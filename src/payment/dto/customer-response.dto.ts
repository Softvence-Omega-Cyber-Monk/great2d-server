import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty({
    description: 'Stripe customer ID',
    example: 'cus_xxxxx',
  })
  customerId: string;
}