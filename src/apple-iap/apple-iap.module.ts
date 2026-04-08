import { Module } from '@nestjs/common';
import { AppleIapService } from './apple-iap.service';
import { AppleIapController } from './apple-iap.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AppleIapController],
  providers: [AppleIapService],
  exports: [AppleIapService],
})
export class AppleIapModule {}
