import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { 
  CreateBillDto, 
  UpdateBillDto, 
  SetSavingsGoalDto
} from './dto/bill.dto';

@Injectable()
export class BillService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService
  ) {}

  // ==================== BILL METHODS ====================
  
  async createBill(userId: string, dto: CreateBillDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new ForbiddenException('User not found or deleted');
    }

    const bill = await this.prisma.bill.create({
      data: {
        userId,
        providerEmail: dto.providerEmail,
        providerName: dto.providerName,
        accountDetails: dto.accountDetails,
        negotiationRecommendation: dto.negotiationRecommendation,
        emailSubject: dto.emailSubject,
        emailBody: dto.emailBody,
        status: dto.status || 'draft',
      }
    });
    
    return bill;
  }

  async getAllBills(userId: string) {
    return this.prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
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
      orderBy: { createdAt: 'desc' }
    });
  }

  async getBillById(userId: string, id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
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

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: {
        providerEmail: dto.providerEmail ?? bill.providerEmail,
        providerName: dto.providerName ?? bill.providerName,
        accountDetails: dto.accountDetails ?? bill.accountDetails,
        negotiationRecommendation: dto.negotiationRecommendation ?? bill.negotiationRecommendation,
        emailSubject: dto.emailSubject ?? bill.emailSubject,
        emailBody: dto.emailBody ?? bill.emailBody,
        emailThreadId: dto.emailThreadId ?? bill.emailThreadId,
        emailMessageId: dto.emailMessageId ?? bill.emailMessageId,
        status: dto.status ?? bill.status,
        sentAt: dto.sentAt ?? bill.sentAt,
      }
    });

    // Send notification if status changed
    if (dto.status && dto.status !== bill.status) {
      await this.sendStatusChangeNotification(userId, updatedBill, bill.status);
    }

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

    const oldStatus = bill.status;
    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        emailThreadId,
        emailMessageId,
      }
    });

    // Send notification
    if (oldStatus !== 'sent') {
      await this.sendStatusChangeNotification(userId, updatedBill, oldStatus);
    }

    return updatedBill;
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

    const oldStatus = bill.status;
    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: { status: status as any }
    });

    // Send notification
    if (oldStatus !== status) {
      await this.sendStatusChangeNotification(userId, updatedBill, oldStatus);
    }

    return updatedBill;
  }

  // ==================== NOTIFICATION HELPER ====================

  private async sendStatusChangeNotification(userId: string, bill: any, oldStatus: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: { fcmToken: true }
      });

      if (user?.fcmToken) {
        await this.firebaseService.sendBillStatusNotification(
          user.fcmToken,
          bill.providerName || bill.providerEmail,
          oldStatus,
          bill.status,
          bill.id
        );
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to send notification:', error.message);
    }
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
        billTrackings: month && year ? {
          where: {
            month: new Date(year, month - 1, 1)
          }
        } : true
      }
    });

    const providerMap = new Map<string, { email: string; name: string | null; savings: number }>();
    
    successfulBills.forEach(bill => {
      const key = bill.providerEmail;
      const existing = providerMap.get(key);
      
      const savings = bill.billTrackings.reduce((sum, tracking) => {
        return sum + (tracking.amount || 0);
      }, 0);

      if (existing) {
        existing.savings += savings;
      } else {
        providerMap.set(key, {
          email: bill.providerEmail,
          name: bill.providerName,
          savings
        });
      }
    });

    const totalSavings = Array.from(providerMap.values()).reduce((sum, val) => sum + val.savings, 0);

    const savingsByProvider = Array.from(providerMap.values()).map(({ email, name, savings }) => ({
      providerEmail: email,
      providerName: name,
      savingsAmount: parseFloat(savings.toFixed(2)),
      percentage: totalSavings > 0 ? parseFloat(((savings / totalSavings) * 100).toFixed(2)) : 0
    }));

    savingsByProvider.sort((a, b) => b.savingsAmount - a.savingsAmount);

    return {
      period: month && year ? { month, year } : 'all-time',
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      providers: savingsByProvider
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
      where: { userId }
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
      take: limit
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
        take: 5
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