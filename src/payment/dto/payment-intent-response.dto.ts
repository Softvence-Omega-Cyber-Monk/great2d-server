import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty({
    description: 'Client secret for Stripe payment',
    example: 'pi_xxxxx_secret_xxxxx',
  })
  clientSecret: string;

  @ApiProperty({
    description: 'Payment intent ID',
    example: 'pi_xxxxx',
  })
  paymentIntentId: string;
}