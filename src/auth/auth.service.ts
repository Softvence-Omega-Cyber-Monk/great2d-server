import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
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

  async forgotPassword(email: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        fullName: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Generate 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString();

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete any existing reset codes for this user
    await this.prisma.passwordReset.deleteMany({
      where: { userId: user.userId },
    });

    // Store the reset code
    await this.prisma.passwordReset.create({
      data: {
        userId: user.userId,
        code,
        expiresAt,
      },
    });

    // Send email with reset code
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.fullName || 'User',
      code,
    );

    return {
      message: 'Password reset code has been sent to your email',
    };
  }

  async verifyOtp(email: string, code: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Find valid reset code
    const passwordReset = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.userId,
        code,
        expiresAt: {
          gte: new Date(),
        },
        usedAt: null,
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    // Mark code as verified (optional: you can add a verifiedAt field)
    return {
      message: 'OTP verified successfully',
      verified: true,
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Find valid reset code
    const passwordReset = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.userId,
        code,
        expiresAt: {
          gte: new Date(),
        },
        usedAt: null,
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { password: hashedPassword },
    });

    // Mark reset code as used
    await this.prisma.passwordReset.update({
      where: { resetId: passwordReset.resetId },
      data: { usedAt: new Date() },
    });

    return { message: 'Password has been reset successfully' };
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