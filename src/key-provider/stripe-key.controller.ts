import { Controller, Get } from '@nestjs/common';
import { StripeKeyService } from './stripe-key.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Stripe Key')
@Controller('stripe-key')
export class StripeKeyController {
  constructor(private readonly stripeKeyService: StripeKeyService) {}

  @Get()
  @ApiOperation({ summary: 'Get Stripe secret key from environment' })
  @ApiResponse({
    status: 200,
    description: 'Returns Stripe secret key',
  })
  getStripeKey() {
    return {
      stripeSecretKey: this.stripeKeyService.getStripeSecretKey(),
    };
  }
}