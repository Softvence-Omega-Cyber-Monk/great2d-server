import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
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
          select: { users: true },
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
          select: { users: true },
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

    // Check if any users are subscribed
    const usersCount = await this.prisma.user.count({
      where: { subscriptionPlanId },
    });

    if (usersCount > 0) {
      throw new Error(
        `Cannot delete plan with ${usersCount} active subscriptions`,
      );
    }

    await this.prisma.subscriptionPlan.delete({
      where: { subscriptionPlanId },
    });

    return { message: 'Subscription plan deleted successfully' };
  }

  async subscribe(userId: string, subscriptionPlanId: string) {
    // Check if plan exists
    await this.findOne(subscriptionPlanId);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user's subscription
    return this.prisma.user.update({
      where: { userId },
      data: { subscriptionPlanId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        subscriptionPlan: true,
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

    if (!user.subscriptionPlanId) {
      throw new Error('User is not subscribed to any plan');
    }

    // Remove user's subscription
    await this.prisma.user.update({
      where: { userId },
      data: { subscriptionPlanId: null },
    });

    return { message: 'Unsubscribed successfully' };
  }
}