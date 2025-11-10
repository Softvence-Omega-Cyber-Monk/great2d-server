import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, fullName?: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default role 'user'
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'user', // Default role
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const payload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        password: true,
        fullName: true,
        role: true,
        isDeleted: true,
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

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        currentSubscription: user.subscriptions[0] || null,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        password: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
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
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('User not found');
    }

    // Remove isDeleted from response
    const { isDeleted, subscriptions, ...userProfile } = user;

    return {
      ...userProfile,
      currentSubscription: subscriptions[0] || null,
    };
  }
}