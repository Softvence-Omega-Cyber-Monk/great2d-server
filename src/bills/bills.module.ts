import { Module } from '@nestjs/common';
import { BillService } from './bills.service';
import { BillController } from './bills.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BillController],
  providers: [BillService, PrismaService],
  exports: [BillService],
})
export class BillModule {}
