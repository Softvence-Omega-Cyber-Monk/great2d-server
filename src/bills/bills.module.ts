import { Module } from '@nestjs/common';
import { BillService } from './bills.service';
import { BillController } from './bills.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  controllers: [BillController],
  providers: [BillService, PrismaService, FirebaseService],
  exports: [BillService],
})
export class BillModule {}