import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        profilePictureUrl: true,
        role: true,
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          where: {
            isActive: true,
            expiresAt: {
              gte: new Date(),
            },
          },
          include: {
            subscriptionPlan: {
              select: {
                subscriptionPlanId: true,
                planName: true,
                price: true,
                duration: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async findAllDeleted() {
    return this.prisma.user.findMany({
      where: { isDeleted: true },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        profilePictureUrl: true,
        role: true,
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          where: {
            isActive: true,
            expiresAt: {
              gte: new Date(),
            },
          },
          include: {
            subscriptionPlan: {
              select: {
                subscriptionPlanId: true,
                planName: true,
                price: true,
                duration: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        profilePictureUrl: true,
        role: true,
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          where: {
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
          take: 1,
        },
        paymentMethods: {
          select: {
            paymentId: true,
            cardHolderName: true,
            cardNumber: true,
            isDefault: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    // Check if user exists and is not deleted
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Update user profile
    return this.prisma.user.update({
      where: { userId },
      data: dto,
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        profilePictureUrl: true,
        role: true,
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          where: {
            isActive: true,
            expiresAt: {
              gte: new Date(),
            },
          },
          include: {
            subscriptionPlan: {
              select: {
                subscriptionPlanId: true,
                planName: true,
                price: true,
                duration: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async removeMe(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { userId },
      data: { isDeleted: true },
    });

    return { message: 'Your account has been deleted successfully' };
  }

  async update(userId: string, requestUserId: string, dto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Users can only update their own profile
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { userId },
      data: dto,
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        profilePictureUrl: true,
        role: true,
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, requestUserId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Users can only delete their own account
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { userId },
      data: { isDeleted: true },
    });

    return { message: 'User deleted successfully' };
  }

  async restore(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isDeleted) {
      throw new ForbiddenException('User is not deleted');
    }

    // Restore user
    await this.prisma.user.update({
      where: { userId },
      data: { isDeleted: false },
    });

    return { message: 'User restored successfully' };
  }

  async permanentDelete(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Permanently delete user (cascade will delete related data)
    await this.prisma.user.delete({
      where: { userId },
    });

    return { message: 'User permanently deleted' };
  }
}