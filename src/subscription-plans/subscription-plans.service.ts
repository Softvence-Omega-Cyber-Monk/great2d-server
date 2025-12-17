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

  constructor(private prisma: PrismaService) {}

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