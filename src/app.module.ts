import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { BillModule } from './bills/bills.module';
import { MailModule } from './mail/mail.module';
import { StripeKeyModule } from './key-provider/stripe-key.module';
import { BillTrackingModule } from './bill-tracking/bill-tracking.module';
import { PayPalModule } from './paypal/paypal.module';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot({isGlobal: true}), AuthModule, UsersModule, PaymentMethodsModule, SubscriptionPlansModule, BillModule, MailModule, StripeKeyModule, BillTrackingModule, PayPalModule],
})
export class AppModule {}
