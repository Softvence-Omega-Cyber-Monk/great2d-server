import { Module } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlansController } from './subscription-plans.controller';

@Module({
  providers: [SubscriptionPlansService],
  controllers: [SubscriptionPlansController]
})
export class SubscriptionPlansModule {}
