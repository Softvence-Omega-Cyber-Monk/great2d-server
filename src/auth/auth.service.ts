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

  // Helper method to generate tokens
  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }

  async socialLogin(
    email: string,
    fullName: string,
    provider: string,
    providerId: string,
    profilePictureUrl?: string,
  ) {
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        profilePictureUrl: true,
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

    let isNewUser = false;

    // If user doesn't exist, create new user
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          fullName,
          password: '', // No password for social login
          role: 'user',
          profilePictureUrl,
          // You might want to add provider and providerId fields to your schema
          // provider,
          // providerId,
        },
        select: {
          userId: true,
          email: true,
          fullName: true,
          role: true,
          profilePictureUrl: true,
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
      isNewUser = true;
    } else if (user.isDeleted) {
      throw new UnauthorizedException('Account has been deleted');
    } else {
      // Update profile picture if provided and user exists
      if (profilePictureUrl && !user.profilePictureUrl) {
        user = await this.prisma.user.update({
          where: { userId: user.userId },
          data: { profilePictureUrl },
          select: {
            userId: true,
            email: true,
            fullName: true,
            role: true,
            profilePictureUrl: true,
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
      }
    }

    // Generate tokens
    const tokens = this.generateTokens(user.userId, user.email, user.role);

    return {
      ...tokens,
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
        currentSubscription: user.subscriptions[0] || null,
      },
      isNewUser,
    };
  }

  async register(email: string, password: string, fullName?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'user',
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens(user.userId, user.email, user.role);

    return {
      ...tokens,
      user: {
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async login(email: string, password: string) {
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

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user.userId, user.email, user.role);

    return {
      ...tokens,
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

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email: string) {
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

    const code = Math.floor(10000 + Math.random() * 90000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.passwordReset.deleteMany({
      where: { userId: user.userId },
    });

    await this.prisma.passwordReset.create({
      data: {
        userId: user.userId,
        code,
        expiresAt,
      },
    });

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

    return {
      message: 'OTP verified successfully',
      verified: true,
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { password: hashedPassword },
    });

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

    const { isDeleted, subscriptions, ...userProfile } = user;

    return {
      ...userProfile,
      currentSubscription: subscriptions[0] || null,
    };
  }
}