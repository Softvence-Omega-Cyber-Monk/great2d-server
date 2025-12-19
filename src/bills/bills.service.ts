import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  ConflictException 
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { 
  CreateBillDto, 
  UpdateBillDto, 
  SetSavingsGoalDto, 
  CreateProviderDto, 
  UpdateProviderDto 
} from './dto/bill.dto';

@Injectable()
export class BillService {
  constructor(private prisma: PrismaService) {}

  // ==================== PROVIDER METHODS ====================
  
  async createProvider(dto: CreateProviderDto) {
    const existing = await this.prisma.provider.findFirst({
      where: { 
        providerName: {
          equals: dto.providerName,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      throw new ConflictException('Provider with this name already exists');
    }

    return this.prisma.provider.create({
      data: {
        providerName: dto.providerName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
      },
    });
  }

  async getAllProviders() {
    return this.prisma.provider.findMany({
      orderBy: { providerName: 'asc' },
      include: {
        _count: {
          select: { bills: true }
        }
      }
    });
  }

  async searchProviders(query: string) {
    return this.prisma.provider.findMany({
      where: {
        providerName: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: { providerName: 'asc' },
      take: 10
    });
  }

  async getProviderById(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { providerId },
      include: {
        _count: {
          select: { bills: true }
        }
      }
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    return provider;
  }

  async updateProvider(providerId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.provider.findUnique({ 
      where: { providerId } 
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    if (dto.providerName && dto.providerName !== provider.providerName) {
      const existing = await this.prisma.provider.findFirst({
        where: { 
          providerName: {
            equals: dto.providerName,
            mode: 'insensitive'
          },
          providerId: {
            not: providerId
          }
        }
      });

      if (existing) {
        throw new ConflictException('Provider with this name already exists');
      }
    }

    return this.prisma.provider.update({
      where: { providerId },
      data: {
        providerName: dto.providerName ?? provider.providerName,
        contactEmail: dto.contactEmail ?? provider.contactEmail,
        contactPhone: dto.contactPhone ?? provider.contactPhone,
      },
    });
  }

  async deleteProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({ 
      where: { providerId },
      include: {
        _count: {
          select: { bills: true }
        }
      }
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found`);
    }

    if (provider._count.bills > 0) {
      throw new ForbiddenException('Cannot delete provider with existing bills');
    }

    await this.prisma.provider.delete({ where: { providerId } });
    return { message: `Provider "${provider.providerName}" deleted successfully` };
  }

  // ==================== BILL METHODS ====================
  
  async createBill(userId: string, dto: CreateBillDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new ForbiddenException('User not found or deleted');
    }

    const provider = await this.prisma.provider.findUnique({
      where: { providerId: dto.providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const bill = await this.prisma.bill.create({
      data: {
        userId,
        providerId: dto.providerId,
        accountDetails: dto.accountDetails,
        negotiationRecommendation: dto.negotiationRecommendation,
        emailSubject: dto.emailSubject,
        emailBody: dto.emailBody,
        status: dto.status || 'draft',
      },
      include: {
        provider: true
      }
    });
    
    return bill;
  }

  async getAllBills(userId: string) {
    return this.prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: true,
        _count: {
          select: { billTrackings: true }
        }
      }
    });
  }

  async getBillsByStatus(userId: string, status: string) {
    return this.prisma.bill.findMany({
      where: { 
        userId,
        status: status as any
      },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: true
      }
    });
  }

  async getBillById(userId: string, id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        provider: true,
        billTrackings: {
          orderBy: { month: 'desc' },
          take: 12
        }
      }
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    return bill;
  }

  async updateBill(userId: string, id: string, dto: UpdateBillDto) {
    const bill = await this.prisma.bill.findUnique({ 
      where: { id } 
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    if (dto.providerId) {
      const provider = await this.prisma.provider.findUnique({
        where: { providerId: dto.providerId },
      });

      if (!provider) {
        throw new NotFoundException('Provider not found');
      }
    }

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: {
        providerId: dto.providerId ?? bill.providerId,
        accountDetails: dto.accountDetails ?? bill.accountDetails,
        negotiationRecommendation: dto.negotiationRecommendation ?? bill.negotiationRecommendation,
        emailSubject: dto.emailSubject ?? bill.emailSubject,
        emailBody: dto.emailBody ?? bill.emailBody,
        emailThreadId: dto.emailThreadId ?? bill.emailThreadId,
        emailMessageId: dto.emailMessageId ?? bill.emailMessageId,
        status: dto.status ?? bill.status,
        sentAt: dto.sentAt ?? bill.sentAt,
      },
      include: {
        provider: true
      }
    });

    return updatedBill;
  }

  async deleteBill(userId: string, id: string) {
    const bill = await this.prisma.bill.findUnique({ 
      where: { id } 
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    await this.prisma.bill.delete({ where: { id } });
    return { message: `Bill deleted successfully` };
  }

  async markBillAsSent(userId: string, id: string, emailThreadId?: string, emailMessageId?: string) {
    const bill = await this.prisma.bill.findUnique({ 
      where: { id } 
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    return this.prisma.bill.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        emailThreadId,
        emailMessageId,
      },
      include: {
        provider: true
      }
    });
  }

  async updateBillStatus(userId: string, id: string, status: string) {
    const bill = await this.prisma.bill.findUnique({ 
      where: { id } 
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    return this.prisma.bill.update({
      where: { id },
      data: { status: status as any },
      include: {
        provider: true
      }
    });
  }

  // ==================== NEW ENDPOINTS IMPLEMENTATION ====================

  async getActiveNegotiationsCount(userId: string) {
    const count = await this.prisma.bill.count({
      where: {
        userId,
        status: 'negotiating'
      }
    });

    return {
      activeNegotiationsCount: count
    };
  }

  async getRecentNegotiations(userId: string, limit: number = 10) {
    const bills = await this.prisma.bill.findMany({
      where: {
        userId,
        status: {
          in: ['negotiating', 'successful', 'sent']
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        provider: true,
        billTrackings: {
          orderBy: { month: 'desc' },
          take: 1
        }
      }
    });

    return {
      count: bills.length,
      negotiations: bills
    };
  }

  async getThisMonthSavings(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const successfulBills = await this.prisma.bill.findMany({
      where: {
        userId,
        status: 'successful',
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        billTrackings: {
          orderBy: { month: 'desc' },
          take: 1
        }
      }
    });

    const totalSavings = successfulBills.reduce((sum, bill) => {
      const latestTracking = bill.billTrackings[0];
      return sum + (latestTracking?.amount || 0);
    }, 0);

    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      billsCount: successfulBills.length
    };
  }

  async getAllTimeSavings(userId: string) {
    const successfulBills = await this.prisma.bill.findMany({
      where: {
        userId,
        status: 'successful'
      },
      include: {
        billTrackings: true
      }
    });

    const totalSavings = successfulBills.reduce((sum, bill) => {
      const billTotalSavings = bill.billTrackings.reduce((trackingSum, tracking) => {
        return trackingSum + (tracking.amount || 0);
      }, 0);
      return sum + billTotalSavings;
    }, 0);

    return {
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      successfulBillsCount: successfulBills.length
    };
  }

  async getSavingsByCategory(userId: string, month?: number, year?: number) {
    let whereClause: any = {
      userId,
      status: 'successful'
    };

    // If month and year are provided, filter by that specific month
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      
      whereClause.updatedAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const successfulBills = await this.prisma.bill.findMany({
      where: whereClause,
      include: {
        provider: true,
        billTrackings: month && year ? {
          where: {
            month: new Date(year, month - 1, 1)
          }
        } : true
      }
    });

    // Group bills by category and calculate savings
    const categoryMap = new Map<string, number>();
    
    successfulBills.forEach(bill => {
      // Assuming provider has a category field, adjust based on your schema
      const category = (bill.provider as any).category || 'other';
      
      const savings = bill.billTrackings.reduce((sum, tracking) => {
        return sum + (tracking.amount || 0);
      }, 0);

      categoryMap.set(category, (categoryMap.get(category) || 0) + savings);
    });

    // Calculate total savings for percentage calculation
    const totalSavings = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

    // Convert to array format with percentages
    const savingsByCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      savingsAmount: parseFloat(amount.toFixed(2)),
      percentage: totalSavings > 0 ? parseFloat(((amount / totalSavings) * 100).toFixed(2)) : 0
    }));

    // Sort by savings amount descending
    savingsByCategory.sort((a, b) => b.savingsAmount - a.savingsAmount);

    return {
      period: month && year ? { month, year } : 'all-time',
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      categories: savingsByCategory
    };
  }

  // ==================== SAVINGS GOALS & STATS ====================
  
  async setSavingsGoal(userId: string, dto: SetSavingsGoalDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new ForbiddenException('User not found or deleted');
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: { monthlySavingsGoal: dto.goalAmount },
    });

    return {
      message: 'Monthly savings goal set successfully',
      goalAmount: updatedUser.monthlySavingsGoal,
    };
  }

  async getSavingsGoal(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { monthlySavingsGoal: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      goalAmount: user.monthlySavingsGoal ?? 0,
    };
  }

  async getBillsStats(userId: string) {
    const bills = await this.prisma.bill.findMany({
      where: { userId },
      include: {
        provider: true
      }
    });

    const stats = {
      total: bills.length,
      byStatus: {
        draft: bills.filter(b => b.status === 'draft').length,
        sent: bills.filter(b => b.status === 'sent').length,
        negotiating: bills.filter(b => b.status === 'negotiating').length,
        successful: bills.filter(b => b.status === 'successful').length,
        failed: bills.filter(b => b.status === 'failed').length,
        cancelled: bills.filter(b => b.status === 'cancelled').length,
      }
    };

    return stats;
  }

  async getRecentActivity(userId: string, limit: number = 10) {
    return this.prisma.bill.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        provider: true
      }
    });
  }

  async getDashboardSummary(userId: string) {
    const [
      totalBills,
      draftBills,
      sentBills,
      negotiatingBills,
      successfulBills,
      recentActivity
    ] = await Promise.all([
      this.prisma.bill.count({ where: { userId } }),
      this.prisma.bill.count({ where: { userId, status: 'draft' } }),
      this.prisma.bill.count({ where: { userId, status: 'sent' } }),
      this.prisma.bill.count({ where: { userId, status: 'negotiating' } }),
      this.prisma.bill.count({ where: { userId, status: 'successful' } }),
      this.prisma.bill.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { provider: true }
      })
    ]);

    return {
      totalBills,
      activeBills: sentBills + negotiatingBills,
      draftBills,
      successfulBills,
      recentActivity
    };
  }
}