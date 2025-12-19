import { Module } from '@nestjs/common';
import { BillTrackingService } from './bill-tracking.service';
import { BillTrackingController } from './bill-tracking.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot() 
  ],
  controllers: [BillTrackingController],
  providers: [BillTrackingService, PrismaService],
  exports: [BillTrackingService]
})
export class BillTrackingModule {}