import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeDto,
} from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
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
    // Check if plan exists
    await this.findOne(subscriptionPlanId);

    return this.prisma.subscriptionPlan.update({
      where: { subscriptionPlanId },
      data: dto,
    });
  }

  async remove(subscriptionPlanId: string) {
    // Check if plan exists
    await this.findOne(subscriptionPlanId);

    // Check if any active subscriptions exist
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        subscriptionPlanId,
        isActive: true,
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

  async subscribe(dto: SubscribeDto) {
    // Check if plan exists
    const plan = await this.findOne(dto.subscriptionPlanId);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId: dto.userId },
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

    // Check if user already has an active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (activeSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Calculate expiration date based on plan duration
    const startDate = new Date(dto.createdAt);
    const expiresAt = new Date(startDate);
    expiresAt.setMonth(expiresAt.getMonth() + plan.duration);

    // Create subscription
    return this.prisma.subscription.create({
      data: {
        userId: dto.userId,
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
          },
        },
      },
    });
  }

  async unsubscribe(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException('User has no active subscription');
    }

    // Deactivate subscription
    await this.prisma.subscription.update({
      where: { subscriptionId: activeSubscription.subscriptionId },
      data: { isActive: false },
    });

    return { message: 'Unsubscribed successfully' };
  }

  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        subscriptionPlan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return subscription;
  }
}