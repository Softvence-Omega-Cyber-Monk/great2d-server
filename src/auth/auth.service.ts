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
  ) { }

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
    fcmToken?: string,
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
          fcmToken,
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
      // Update profile picture and FCM token if provided
      const updateData: any = {};

      if (profilePictureUrl && !user.profilePictureUrl) {
        updateData.profilePictureUrl = profilePictureUrl;
      }

      if (fcmToken) {
        updateData.fcmToken = fcmToken;
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { userId: user.userId },
          data: updateData,
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

  async register(email: string, password: string, fullName?: string, fcmToken?: string) {
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
        fcmToken,
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

  async login(email: string, password: string, fcmToken?: string) {
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

    // Update FCM token if provided
    if (fcmToken) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: { fcmToken },
      });
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
  // Add these methods to your existing AuthService class

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        fullName: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Create or update Google OAuth user with tokens
   */
  async createOrUpdateOAuthUser(
    email: string,
    accessToken: string,
    refreshToken: string,
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user's tokens
      const updatedUser = await this.prisma.user.update({
        where: { email },
        data: {
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        },
        select: {
          userId: true,
          email: true,
          fullName: true,
          googleAccessToken: true,
          googleRefreshToken: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        message: 'OAuth tokens updated successfully',
        user: updatedUser,
      };
    } else {
      // Create new user with OAuth tokens
      const newUser = await this.prisma.user.create({
        data: {
          email,
          password: '', // No password for OAuth users
          role: 'user',
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        },
        select: {
          userId: true,
          email: true,
          fullName: true,
          googleAccessToken: true,
          googleRefreshToken: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        message: 'OAuth user created successfully',
        user: newUser,
      };
    }
  }

  /**
   * Update user's OAuth tokens
   */
  async updateOAuthTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: any = {
      googleAccessToken: accessToken,
    };

    // Only update refresh token if provided
    if (refreshToken) {
      updateData.googleRefreshToken = refreshToken;
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        email: true,
        fullName: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'OAuth tokens updated successfully',
      user: updatedUser,
    };
  }
}