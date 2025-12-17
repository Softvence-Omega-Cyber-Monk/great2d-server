// bill-tracking.module.ts

import { Module } from '@nestjs/common';
import { BillTrackingService } from './bill-tracking.service';
import { BillTrackingController } from './bill-tracking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot() 
  ],
  controllers: [BillTrackingController],
  providers: [BillTrackingService],
  exports: [BillTrackingService]
})
export class BillTrackingModule {}
