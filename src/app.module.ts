import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { BillModule } from './bills/bills.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot({isGlobal: true}), AuthModule, UsersModule, PaymentMethodsModule, SubscriptionPlansModule, BillModule, MailModule],
})
export class AppModule {}
