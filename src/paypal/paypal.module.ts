// paypal/paypal.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayPalService } from './paypal.service';
import { PayPalController } from './paypal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import paypalConfig from '../config/paypal.config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(paypalConfig),
  ],
  controllers: [PayPalController],
  providers: [PayPalService],
  exports: [PayPalService],
})
export class PayPalModule {}
