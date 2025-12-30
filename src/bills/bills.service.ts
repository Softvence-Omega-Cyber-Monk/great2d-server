import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationService } from 'src/notification/notification.service';
import {
  CreateBillDto,
  UpdateBillDto,
  SetSavingsGoalDto
} from './dto/bill.dto';
import { NotificationType } from 'src/notification/notification.dto';

@Injectable()
export class BillService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
  ) { }

  //  BILL METHODS 

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
        category: dto.category || 'other',
        accountDetails: dto.accountDetails,
        negotiationRecommendation: dto.negotiationRecommendation,
        emailSubject: dto.emailSubject,
        emailBody: dto.emailBody,
        status: dto.status || 'draft',
        actualAmount: dto.actualAmount,
        negotiatedAmount: dto.negotiatedAmount,
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
        status: status
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

    const oldStatus = bill.status;

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: {
        providerEmail: dto.providerEmail ?? bill.providerEmail,
        providerName: dto.providerName ?? bill.providerName,
        category: dto.category ?? bill.category,
        accountDetails: dto.accountDetails ?? bill.accountDetails,
        negotiationRecommendation: dto.negotiationRecommendation ?? bill.negotiationRecommendation,
        emailSubject: dto.emailSubject ?? bill.emailSubject,
        emailBody: dto.emailBody ?? bill.emailBody,
        emailThreadId: dto.emailThreadId ?? bill.emailThreadId,
        emailMessageId: dto.emailMessageId ?? bill.emailMessageId,
        status: dto.status ?? bill.status,
        sentAt: dto.sentAt ?? bill.sentAt,
        actualAmount: dto.actualAmount ?? bill.actualAmount,
        negotiatedAmount: dto.negotiatedAmount ?? bill.negotiatedAmount,
      }
    });

    // Send notification if status changed
    if (dto.status && dto.status !== oldStatus) {
      await this.sendStatusChangeNotification(userId, updatedBill, oldStatus);
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
      data: { status: status }
    });

    // Send notification
    if (oldStatus !== status) {
      await this.sendStatusChangeNotification(userId, updatedBill, oldStatus);
    }

    return updatedBill;
  }

  // ==================== PUBLIC STATUS UPDATE (NO AUTH) ====================

  async publicUpdateBillStatus(
    userId: string,
    billId: string,
    status: string,
    actualAmount?: number,
    negotiatedAmount?: number
  ) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${billId} not found`);
    }

    // Verify the userId matches the bill owner
    if (bill.userId !== userId) {
      throw new ForbiddenException('User ID does not match bill owner');
    }

    const oldStatus = bill.status;

    // Build update data
    const updateData: any = { status };
    if (actualAmount !== undefined) updateData.actualAmount = actualAmount;
    if (negotiatedAmount !== undefined) updateData.negotiatedAmount = negotiatedAmount;

    const updatedBill = await this.prisma.bill.update({
      where: { id: billId },
      data: updateData
    });

    // Send notification if status changed
    if (oldStatus !== status) {
      await this.sendStatusChangeNotification(userId, updatedBill, oldStatus);
    }

    return {
      success: true,
      message: 'Bill status updated successfully',
      bill: updatedBill
    };
  }

  // ==================== NOTIFICATION HELPER ====================

  private async sendStatusChangeNotification(userId: string, bill: any, oldStatus: string) {
    try {
      // Get user with FCM token
      const user = await this.prisma.user.findUnique({
        where: { userId },
        select: {
          fcmToken: true,
          isNotificationsEnabled: true
        }
      });

      const providerName = bill.providerName || bill.providerEmail;
      const { title, body } = this.getNotificationContent(providerName, oldStatus, bill.status);

      // 1. Save notification to database
      await this.notificationService.createNotification({
        userId,
        title,
        body,
        type: NotificationType.BILL_STATUS_CHANGE,
        billId: bill.id,
        data: {
          oldStatus,
          newStatus: bill.status,
          providerName,
          providerEmail: bill.providerEmail,
          category: bill.category,
        },
      });

      // 2. Send push notification if user has FCM token and notifications enabled
      if (user?.fcmToken && user.isNotificationsEnabled) {
        await this.firebaseService.sendBillStatusNotification(
          user.fcmToken,
          providerName,
          oldStatus,
          bill.status,
          bill.id
        );
        console.log(`Push notification sent successfully for bill ${bill.id}`);
      } else {
        console.log(`Push notification skipped for bill ${bill.id} - No FCM token or notifications disabled`);
      }

      console.log(`Notification saved to database for bill ${bill.id}`);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Get notification content based on status change
   */
  private getNotificationContent(
    providerName: string,
    oldStatus: string,
    newStatus: string,
  ): { title: string; body: string } {
    const statusMessages: Record<string, { title: string; body: string }> = {
      draft: {
        title: 'Bill Draft Created',
        body: `Your negotiation draft for ${providerName} has been created.`,
      },
      sent: {
        title: 'Negotiation Email Sent',
        body: `Your negotiation email to ${providerName} has been sent successfully!`,
      },
      negotiating: {
        title: 'Negotiation in Progress',
        body: `${providerName} is reviewing your negotiation request.`,
      },
      successful: {
        title: '🎉 Negotiation Successful!',
        body: `Great news! Your negotiation with ${providerName} was successful!`,
      },
      failed: {
        title: 'Negotiation Update',
        body: `Your negotiation with ${providerName} didn't go through this time.`,
      },
      cancelled: {
        title: 'Negotiation Cancelled',
        body: `Your negotiation with ${providerName} has been cancelled.`,
      },
    };

    return (
      statusMessages[newStatus] || {
        title: 'Bill Status Updated',
        body: `Your bill with ${providerName} has been updated from ${oldStatus} to ${newStatus}.`,
      }
    );
  }

  // ==================== SAVINGS CALCULATION HELPER ====================

  private calculateSavings(actualAmount: number | null, negotiatedAmount: number | null): number {
    if (!actualAmount || !negotiatedAmount) {
      return 0;
    }
    return actualAmount - negotiatedAmount;
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
      select: {
        id: true,
        actualAmount: true,
        negotiatedAmount: true,
        providerName: true,
        providerEmail: true
      }
    });

    const totalSavings = successfulBills.reduce((sum, bill) => {
      const savings = this.calculateSavings(bill.actualAmount, bill.negotiatedAmount);
      return sum + savings;
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
      select: {
        id: true,
        actualAmount: true,
        negotiatedAmount: true,
        providerName: true,
        providerEmail: true
      }
    });

    const totalSavings = successfulBills.reduce((sum, bill) => {
      const savings = this.calculateSavings(bill.actualAmount, bill.negotiatedAmount);
      return sum + savings;
    }, 0);

    return {
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      successfulBillsCount: successfulBills.length
    };
  }

  // Replace the getSavingsByCategory method in bills.service.ts

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
    select: {
      id: true,
      category: true,
      actualAmount: true,
      negotiatedAmount: true
    }
  });

  // Group by category
  const categoryMap = new Map<string, { category: string; savings: number; count: number }>();

  successfulBills.forEach(bill => {
    const category = bill.category || 'other';
    const existing = categoryMap.get(category);

    const savings = this.calculateSavings(bill.actualAmount, bill.negotiatedAmount);

    if (existing) {
      existing.savings += savings;
      existing.count += 1;
    } else {
      categoryMap.set(category, {
        category,
        savings,
        count: 1
      });
    }
  });

  const totalSavings = Array.from(categoryMap.values()).reduce((sum, val) => sum + val.savings, 0);

  const savingsByCategory = Array.from(categoryMap.values()).map(({ category, savings, count }) => ({
    category,
    savingsAmount: parseFloat(savings.toFixed(2)),
    billsCount: count,
    percentage: totalSavings > 0 ? parseFloat(((savings / totalSavings) * 100).toFixed(2)) : 0
  }));

  // Sort by savings amount (highest first)
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
  async getAllBillsAdmin(status?: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    // Get total count for pagination
    const total = await this.prisma.bill.count({ where: whereClause });

    // Get bills with user information
    const bills = await this.prisma.bill.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            fullName: true,
            phone: true,
            profilePictureUrl: true,
            role: true,
            createdAt: true,
            isDarkMode: true,
            isNotificationsEnabled: true,
            isUsingBiometrics: true
          }
        }
      }
    });

    // Transform the data to include calculated savings
    const transformedBills = bills.map(bill => ({
      id: bill.id,
      userId: bill.userId,
      userEmail: bill.user?.email || 'N/A',
      userFullName: bill.user?.fullName || 'N/A',
      userPhone: bill.user?.phone || 'N/A',
      userProfilePicture: bill.user?.profilePictureUrl || null,
      userRole: bill.user?.role || 'user',
      userCreatedAt: bill.user?.createdAt || null,
      userPreferences: {
        isDarkMode: bill.user?.isDarkMode || false,
        isNotificationsEnabled: bill.user?.isNotificationsEnabled || true,
        isUsingBiometrics: bill.user?.isUsingBiometrics || false
      },
      providerEmail: bill.providerEmail,
      providerName: bill.providerName,
      category: bill.category,
      status: bill.status,
      actualAmount: bill.actualAmount,
      negotiatedAmount: bill.negotiatedAmount,
      savings: this.calculateSavings(bill.actualAmount, bill.negotiatedAmount),
      accountDetails: bill.accountDetails,
      emailSubject: bill.emailSubject,
      emailThreadId: bill.emailThreadId,
      emailMessageId: bill.emailMessageId,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
      sentAt: bill.sentAt
    }));

    return {
      bills: transformedBills,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        totalBills: total,
        statusBreakdown: await this.getAdminStatusBreakdown(whereClause)
      }
    };
  }

  private async getAdminStatusBreakdown(whereClause: any) {
    const statuses = ['draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled'];

    const breakdown = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.prisma.bill.count({
          where: { ...whereClause, status }
        })
      }))
    );

    return breakdown;
  }
}