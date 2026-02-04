import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeDto,
} from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(private prisma: PrismaService) { }

  async create(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(subscriptionPlanId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { subscriptionPlanId },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async update(subscriptionPlanId: string, dto: UpdateSubscriptionPlanDto) {
    await this.findOne(subscriptionPlanId);

    return this.prisma.subscriptionPlan.update({
      where: { subscriptionPlanId },
      data: dto,
    });
  }

  async remove(subscriptionPlanId: string) {
    await this.findOne(subscriptionPlanId);

    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        subscriptionPlanId,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${activeSubscriptions} active subscriptions`,
      );
    }

    await this.prisma.subscriptionPlan.delete({
      where: { subscriptionPlanId },
    });

    return { message: 'Subscription plan deleted successfully' };
  }

  async getAllSubscriptions(status?: 'active' | 'expired' | 'all') {
    const now = new Date();

    // Build where clause based on status filter
    let whereClause: any = {};

    if (status === 'active') {
      whereClause = {
        isActive: true,
        expiresAt: {
          gte: now,
        },
      };
    } else if (status === 'expired') {
      whereClause = {
        OR: [
          { isActive: false },
          {
            isActive: true,
            expiresAt: {
              lt: now,
            },
          },
        ],
      };
    }
    // For 'all' or undefined, no where clause filtering

    const subscriptions = await this.prisma.subscription.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        subscriptionPlan: {
          select: {
            subscriptionPlanId: true,
            planName: true,
            description: true,
            price: true,
            duration: true,
            features: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate status for each subscription
    const enrichedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      status: sub.isActive && sub.expiresAt >= now ? 'active' : 'expired',
      daysRemaining: sub.expiresAt >= now
        ? Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return {
      total: enrichedSubscriptions.length,
      activeCount: enrichedSubscriptions.filter(s => s.status === 'active').length,
      expiredCount: enrichedSubscriptions.filter(s => s.status === 'expired').length,
      subscriptions: enrichedSubscriptions,
    };
  }

  async getAllUserSubscriptions(userId: string) {
    const now = new Date();

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      include: {
        subscriptionPlan: {
          select: {
            subscriptionPlanId: true,
            planName: true,
            description: true,
            price: true,
            duration: true,
            features: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Enrich with status and days remaining
    const enrichedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      status: sub.isActive && sub.expiresAt >= now ? 'active' : 'expired',
      daysRemaining: sub.expiresAt >= now
        ? Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return {
      total: enrichedSubscriptions.length,
      activeCount: enrichedSubscriptions.filter(s => s.status === 'active').length,
      expiredCount: enrichedSubscriptions.filter(s => s.status === 'expired').length,
      subscriptions: enrichedSubscriptions,
    };
  }

  async getSubscriptionGraphData(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly',
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    
    // Default date range: last 12 months
    const defaultStartDate = new Date(now);
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 12);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : now;

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format (e.g., 2024-01-01)');
    }

    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Fetch all subscriptions in the date range
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        subscriptionPlan: {
          select: {
            subscriptionPlanId: true,
            planName: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group data by period
    const groupedData = this.groupSubscriptionsByPeriod(subscriptions, period, start, end);
    
    // Calculate statistics
    const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.subscriptionPlan.price, 0);
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.isActive && sub.expiresAt >= now
    ).length;

    // Group by plan
    const byPlan = this.groupByPlan(subscriptions);

    return {
      period,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions,
        expiredSubscriptions: subscriptions.length - activeSubscriptions,
        totalRevenue,
        averageRevenue: subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0,
      },
      timeSeriesData: groupedData,
      byPlan,
    };
  }

  private groupSubscriptionsByPeriod(
    subscriptions: any[],
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    start: Date,
    end: Date,
  ) {
    const dataMap = new Map<string, any>();

    // Initialize all periods in range
    const current = new Date(start);
    while (current <= end) {
      const key = this.getDateKey(current, period);
      dataMap.set(key, {
        period: key,
        count: 0,
        revenue: 0,
        active: 0,
        expired: 0,
      });
      this.incrementDate(current, period);
    }

    const now = new Date();

    // Populate with actual data
    subscriptions.forEach(sub => {
      const key = this.getDateKey(new Date(sub.createdAt), period);
      if (dataMap.has(key)) {
        const data = dataMap.get(key);
        data.count += 1;
        data.revenue += sub.subscriptionPlan.price;
        if (sub.isActive && sub.expiresAt >= now) {
          data.active += 1;
        } else {
          data.expired += 1;
        }
      }
    });

    return Array.from(dataMap.values());
  }

  private groupByPlan(subscriptions: any[]) {
    const planMap = new Map<string, any>();

    subscriptions.forEach(sub => {
      const planId = sub.subscriptionPlan.subscriptionPlanId;
      if (!planMap.has(planId)) {
        planMap.set(planId, {
          planId,
          planName: sub.subscriptionPlan.planName,
          count: 0,
          revenue: 0,
          active: 0,
        });
      }
      const plan = planMap.get(planId);
      plan.count += 1;
      plan.revenue += sub.subscriptionPlan.price;
      if (sub.isActive && sub.expiresAt >= new Date()) {
        plan.active += 1;
      }
    });

    return Array.from(planMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  private getDateKey(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (period) {
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'monthly':
        return `${year}-${month}`;
      case 'yearly':
        return `${year}`;
      default:
        return `${year}-${month}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private incrementDate(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): void {
    switch (period) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    this.logger.log(`Subscribe called for user: ${userId}`);

    // Check if plan exists
    const plan = await this.findOne(dto.subscriptionPlanId);
    this.logger.log(`Plan found: ${plan.planName}, Duration: ${plan.duration} months`);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if transaction ID already exists
    const existingTransaction = await this.prisma.subscription.findUnique({
      where: { transactionId: dto.transactionId },
    });

    if (existingTransaction) {
      throw new ConflictException('Transaction ID already exists');
    }

    // Check if user already has an active, non-expired subscription
    const now = new Date();
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gte: now,
        },
      },
    });

    if (activeSubscription) {
      throw new BadRequestException(
        'User already has an active subscription. Please unsubscribe first.',
      );
    }

    // Deactivate any expired subscriptions
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        isActive: false,
      },
    });

    // Use provided date or current date
    const startDate = dto.createdAt ? new Date(dto.createdAt) : new Date();

    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid date format for createdAt');
    }

    // Validate that start date is not too far in the past
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (startDate < thirtyDaysAgo) {
      throw new BadRequestException(
        'Start date cannot be more than 30 days in the past. Please use current date or omit createdAt field.'
      );
    }

    // Calculate expiration date - Use UTC to avoid timezone issues
    const expiresAt = new Date(startDate);
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + plan.duration);

    // Verify the subscription won't be expired immediately
    if (expiresAt <= now) {
      throw new BadRequestException(
        `Subscription would expire immediately. Start date: ${startDate.toISOString()}, Expiry would be: ${expiresAt.toISOString()}`
      );
    }

    this.logger.log(`Creating subscription:`);
    this.logger.log(`User ID: ${userId}`);
    this.logger.log(`Start Date: ${startDate.toISOString()}`);
    this.logger.log(`Expires At: ${expiresAt.toISOString()}`);
    this.logger.log(`Current Time: ${now.toISOString()}`);
    this.logger.log(`Is Active: true`);
    this.logger.log(`Expiry > Now: ${expiresAt > now}`);

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        subscriptionPlanId: dto.subscriptionPlanId,
        transactionId: dto.transactionId,
        startDate: startDate,
        expiresAt: expiresAt,
        isActive: true,
      },
      include: {
        subscriptionPlan: {
          select: {
            planName: true,
            price: true,
            duration: true,
            features: true,
          },
        },
      },
    });

    this.logger.log(`Subscription created successfully: ${subscription.subscriptionId}`);

    return subscription;
  }

  async unsubscribe(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    // Find active, non-expired subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gte: now,
        },
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Deactivate subscription
    await this.prisma.subscription.update({
      where: { subscriptionId: activeSubscription.subscriptionId },
      data: {
        isActive: false,
        updatedAt: now,
      },
    });

    return {
      message: 'Unsubscribed successfully',
      subscriptionId: activeSubscription.subscriptionId,
    };
  }

  async getUserSubscription(userId: string) {
    const now = new Date();

    this.logger.log(`Getting subscription for user: ${userId}`);
    this.logger.log(`Current time: ${now.toISOString()}`);

    // First, let's see ALL subscriptions for this user for debugging
    const allUserSubs = await this.prisma.subscription.findMany({
      where: { userId },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Total subscriptions for user: ${allUserSubs.length}`);

    allUserSubs.forEach((sub, index) => {
      this.logger.log(`Subscription ${index + 1}:`);
      this.logger.log(`  ID: ${sub.subscriptionId}`);
      this.logger.log(`  Plan: ${sub.subscriptionPlan.planName}`);
      this.logger.log(`  Is Active: ${sub.isActive}`);
      this.logger.log(`  Start Date: ${sub.startDate.toISOString()}`);
      this.logger.log(`  Expires At: ${sub.expiresAt.toISOString()}`);
      this.logger.log(`  Expires At > Now: ${sub.expiresAt > now}`);
      this.logger.log(`  Expires At >= Now: ${sub.expiresAt >= now}`);
    });

    // Clean up expired subscriptions
    const updateResult = await this.prisma.subscription.updateMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Deactivated ${updateResult.count} expired subscriptions`);

    // Get active, non-expired subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gte: now,
        },
      },
      include: {
        subscriptionPlan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      this.logger.warn(`No active subscription found for user ${userId}`);
      throw new NotFoundException('No active subscription found for this user');
    }

    this.logger.log(`Active subscription found: ${subscription.subscriptionId}`);

    return subscription;
  }

  async cleanupExpiredSubscriptions() {
    const now = new Date();

    // Deactivate all expired subscriptions
    const result = await this.prisma.subscription.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired subscriptions`);

    return {
      message: 'Expired subscriptions cleaned up successfully',
      count: result.count,
    };
  }
}