import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeKeyService {
  constructor(private configService: ConfigService) {}

  getStripeSecretKey(): string {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY')
    return stripeKey!;
  }
}
