import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBillDto, UpdateBillDto } from './dto/bill.dto';

@Injectable()
export class BillService {
  constructor(private prisma: PrismaService) {}

  async createBill(userId: string, dto: CreateBillDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new ForbiddenException('User not found or deleted');
    }

    const bill = await this.prisma.bill.create({
      data: {
        billName: dto.billName,
        category: dto.category,
        provider: dto.provider,
        status: dto.status,
        previousRate: dto.previousRate,
        newRate: dto.newRate,
        userId: userId,
      },
    });
    return bill;
  }

  async getAllBills(userId: string) {
    return this.prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBillById(userId: string, id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    // Ensure the bill belongs to the requesting user
    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    return bill;
  }

  async updateBill(userId: string, id: string, dto: UpdateBillDto) {
    const billExists = await this.prisma.bill.findUnique({ 
      where: { id } 
    });

    if (!billExists) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    // Ensure the bill belongs to the requesting user
    if (billExists.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: {
        billName: dto.billName ?? billExists.billName,
        category: dto.category ?? billExists.category,
        provider: dto.provider ?? billExists.provider,
        status: dto.status ?? billExists.status,
        previousRate: dto.previousRate ?? billExists.previousRate,
        newRate: dto.newRate ?? billExists.newRate,
      },
    });

    return updatedBill;
  }

  async deleteBill(userId: string, id: string) {
    const billExists = await this.prisma.bill.findUnique({ 
      where: { id } 
    });

    if (!billExists) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    // Ensure the bill belongs to the requesting user
    if (billExists.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    await this.prisma.bill.delete({ where: { id } });
    return { message: `Bill with ID ${id} deleted successfully` };
  }

  private calculateSavings(previousRate: number, newRate: number): number {
    if (previousRate === 0) return 0;
    return ((previousRate - newRate) / previousRate) * 100;
  }

  async getThisMonthSavings(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const bills = await this.prisma.bill.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    let totalPrev = 0;
    let totalNew = 0;
    bills.forEach(b => {
      totalPrev += b.previousRate;
      totalNew += b.newRate;
    });

    const savings = totalPrev - totalNew;
    const percent = totalPrev ? ((savings / totalPrev) * 100).toFixed(2) : '0';

    return {
      month: now.toLocaleString('default', { month: 'long' }),
      totalBills: bills.length,
      totalPrevious: totalPrev,
      totalNew: totalNew,
      totalSavings: savings,
      percentSaved: `${percent}%`,
    };
  }

  async getAllTimeSavings(userId: string) {
    const result = await this.prisma.bill.aggregate({
      where: { userId },
      _sum: { previousRate: true, newRate: true },
    });

    const prev = result._sum.previousRate ?? 0;
    const next = result._sum.newRate ?? 0;
    const saved = prev - next;
    const percent = prev ? ((saved / prev) * 100).toFixed(2) : '0';

    return {
      totalPrevious: prev,
      totalNew: next,
      totalSavings: saved,
      percentSaved: `${percent}%`,
    };
  }

  async getSavingsByCategory(userId: string) {
    const grouped = await this.prisma.bill.groupBy({
      by: ['category'],
      where: { userId },
      _sum: { previousRate: true, newRate: true },
    });

    return grouped.map(g => {
      const prev = g._sum.previousRate ?? 0;
      const next = g._sum.newRate ?? 0;
      const saved = prev - next;
      const percent = prev ? ((saved / prev) * 100).toFixed(2) : '0';

      return {
        category: g.category,
        totalPrevious: prev,
        totalNew: next,
        totalSavings: saved,
        percentSaved: `${percent}%`,
      };
    });
  }

  async getMonthlyBreakdown(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const bills = await this.prisma.bill.findMany({
      where: { 
        userId,
        createdAt: { gte: startOfMonth } 
      },
      orderBy: { createdAt: 'desc' },
    });

    return bills.map(b => ({
      billName: b.billName,
      provider: b.provider,
      newRate: `$${b.newRate}`,
      percentSaved: `${this.calculateSavings(b.previousRate, b.newRate).toFixed(0)}% saved`,
      category: b.category,
    }));
  }
}