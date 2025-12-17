import { Module } from '@nestjs/common';
import { StripeKeyController } from './stripe-key.controller';
import { StripeKeyService } from './stripe-key.service';

@Module({
  controllers: [StripeKeyController],
  providers: [StripeKeyService],
  exports: [StripeKeyService],
})
export class StripeKeyModule {}