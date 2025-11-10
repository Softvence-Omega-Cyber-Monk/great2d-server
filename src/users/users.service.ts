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
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        createdAt: true,
        updatedAt: true,
        subscriptionPlan: {
          select: {
            subscriptionPlanId: true,
            planName: true,
            price: true,
          },
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
        isDarkMode: true,
        isNotificationsEnabled: true,
        isUsingBiometrics: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        subscriptionPlan: true,
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
}