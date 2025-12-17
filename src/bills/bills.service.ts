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
  // Note: Providers are global, not user-specific
  
  async createProvider(dto: CreateProviderDto) {
    // Check if provider already exists
    const existing = await this.prisma.provider.findFirst({
      where: { 
        providerName: {
          equals: dto.providerName,
          mode: 'insensitive' // Case-insensitive check
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

    // Check for name conflict if name is being updated
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

    // Check if provider has associated bills
    if (provider._count.bills > 0) {
      throw new ForbiddenException('Cannot delete provider with existing bills');
    }

    await this.prisma.provider.delete({ where: { providerId } });
    return { message: `Provider "${provider.providerName}" deleted successfully` };
  }

  // ==================== BILL METHODS ====================
  
  async createBill(userId: string, dto: CreateBillDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new ForbiddenException('User not found or deleted');
    }

    // Verify provider exists
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
          take: 12 // Last 12 months
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

    // If providerId is being updated, verify it exists
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