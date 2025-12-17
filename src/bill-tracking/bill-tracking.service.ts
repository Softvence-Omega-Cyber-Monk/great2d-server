// bill-tracking.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillTrackingDto, UpdateBillTrackingDto, MonthlyBillSummaryDto } from './dto/bill-tracking.dto';
import { BillPaymentStatus } from 'generated/prisma';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BillTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new bill tracking record for a specific month
   */
  async create(userId: string, createDto: CreateBillTrackingDto) {
    // Verify bill exists and belongs to user
    const bill = await this.prisma.bill.findFirst({
      where: { id: createDto.billId, userId },
      include: { provider: true }
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    // Parse month and create first day of month
    const monthDate = this.parseMonthToDate(createDto.month);

    // Check if tracking already exists for this bill and month
    const existing = await this.prisma.billTracking.findUnique({
      where: {
        billId_month: {
          billId: createDto.billId,
          month: monthDate
        }
      }
    });

    if (existing) {
      throw new BadRequestException('Bill tracking already exists for this month');
    }

    // Get bill name and category from the bill or use provider name as fallback
    const billName = bill.accountDetails || bill.provider?.providerName || 'Unnamed Bill';
    const provider = bill.provider?.providerName || 'Unknown Provider';

    return this.prisma.billTracking.create({
      data: {
        billId: createDto.billId,
        month: monthDate,
        billName: billName,
        category: 'other' as any, // Default category
        provider: provider,
        amount: createDto.amount,
        dueDate: new Date(createDto.dueDate),
        paymentStatus: BillPaymentStatus.due,
        userId
      }
    });
  }

  /**
   * Get all bill tracking records for a user
   */
  async findAll(userId: string, month?: string) {
    const where: any = { userId };

    if (month) {
      const monthDate = this.parseMonthToDate(month);
      where.month = monthDate;
    }

    return this.prisma.billTracking.findMany({
      where,
      orderBy: [
        { month: 'desc' },
        { dueDate: 'asc' }
      ],
      include: {
        bill: {
          include: {
            provider: true
          }
        }
      }
    });
  }

  /**
   * Get a specific bill tracking record
   */
  async findOne(userId: string, id: string) {
    const tracking = await this.prisma.billTracking.findFirst({
      where: { id, userId },
      include: {
        bill: {
          include: {
            provider: true
          }
        }
      }
    });

    if (!tracking) {
      throw new NotFoundException('Bill tracking record not found');
    }

    return tracking;
  }

  /**
   * Update bill tracking record (e.g., mark as paid)
   */
  async update(userId: string, id: string, updateDto: UpdateBillTrackingDto) {
    await this.findOne(userId, id);

    const data: any = {};

    if (updateDto.paymentStatus !== undefined) {
      data.paymentStatus = updateDto.paymentStatus;
      
      // If marking as paid, set paidAt to now if not provided
      if (updateDto.paymentStatus === BillPaymentStatus.paid && !updateDto.paidAt) {
        data.paidAt = new Date();
      }
    }

    if (updateDto.paidAt) {
      data.paidAt = new Date(updateDto.paidAt);
    }

    if (updateDto.amount !== undefined) {
      data.amount = updateDto.amount;
    }

    if (updateDto.dueDate) {
      data.dueDate = new Date(updateDto.dueDate);
    }

    return this.prisma.billTracking.update({
      where: { id },
      data
    });
  }

  /**
   * Mark a bill as paid
   */
  async markAsPaid(userId: string, id: string) {
    return this.update(userId, id, {
      paymentStatus: BillPaymentStatus.paid,
      paidAt: new Date().toISOString()
    });
  }

  /**
   * Delete a bill tracking record
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    
    return this.prisma.billTracking.delete({
      where: { id }
    });
  }

  /**
   * Get monthly summary for a user
   */
  async getMonthlySummary(userId: string, month: string): Promise<MonthlyBillSummaryDto> {
    const monthDate = this.parseMonthToDate(month);

    const trackings = await this.prisma.billTracking.findMany({
      where: { userId, month: monthDate }
    });

    const summary: MonthlyBillSummaryDto = {
      month,
      totalBills: trackings.length,
      paidBills: trackings.filter(t => t.paymentStatus === BillPaymentStatus.paid).length,
      dueBills: trackings.filter(t => t.paymentStatus === BillPaymentStatus.due).length,
      overdueBills: trackings.filter(t => t.paymentStatus === BillPaymentStatus.overdue).length,
      totalAmount: trackings.reduce((sum, t) => sum + t.amount, 0),
      paidAmount: trackings
        .filter(t => t.paymentStatus === BillPaymentStatus.paid)
        .reduce((sum, t) => sum + t.amount, 0),
      dueAmount: trackings
        .filter(t => t.paymentStatus !== BillPaymentStatus.paid)
        .reduce((sum, t) => sum + t.amount, 0)
    };

    return summary;
  }

  /**
   * Automatically create tracking records for all bills at the beginning of each month
   * Runs on the 1st of every month at 00:01 AM
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async createMonthlyTrackingRecords() {
    console.log('Creating monthly bill tracking records...');

    const now = new Date();
    const currentMonth = this.getMonthStart(now);

    // Get all active bills with their providers
    const bills = await this.prisma.bill.findMany({
      include: {
        user: true,
        provider: true
      }
    });

    for (const bill of bills) {
      // Check if tracking already exists for this month
      const existing = await this.prisma.billTracking.findUnique({
        where: {
          billId_month: {
            billId: bill.id,
            month: currentMonth
          }
        }
      });

      if (!existing) {
        // Create new tracking record with due date set to 15th of the month
        const dueDate = new Date(currentMonth);
        dueDate.setDate(15);

        const billName = bill.accountDetails || bill.provider?.providerName || 'Unnamed Bill';
        const providerName = bill.provider?.providerName || 'Unknown Provider';
        const amount = 0; // Default amount, should be updated by user

        await this.prisma.billTracking.create({
          data: {
            billId: bill.id,
            month: currentMonth,
            billName: billName,
            category: 'other' as any, // Default category
            provider: providerName,
            amount: amount,
            dueDate: dueDate,
            paymentStatus: BillPaymentStatus.due,
            userId: bill.userId
          }
        });

        console.log(`Created tracking for bill: ${billName} (${bill.userId})`);
      }
    }

    console.log('Monthly bill tracking records created successfully');
  }

  /**
   * Update overdue bills
   * Runs daily at 1:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async updateOverdueBills() {
    console.log('Checking for overdue bills...');

    const now = new Date();

    // Find all due bills where due date has passed
    const overdueBills = await this.prisma.billTracking.findMany({
      where: {
        paymentStatus: BillPaymentStatus.due,
        dueDate: {
          lt: now
        }
      }
    });

    // Update them to overdue
    for (const bill of overdueBills) {
      await this.prisma.billTracking.update({
        where: { id: bill.id },
        data: { paymentStatus: BillPaymentStatus.overdue }
      });
    }

    console.log(`Updated ${overdueBills.length} bills to overdue status`);
  }

  /**
   * Helper: Parse month string (YYYY-MM) to Date (first day of month)
   */
  private parseMonthToDate(monthString: string): Date {
    const [year, month] = monthString.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('Invalid month format. Use YYYY-MM');
    }
    return new Date(year, month - 1, 1);
  }

  /**
   * Helper: Get the first day of the month
   */
  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}