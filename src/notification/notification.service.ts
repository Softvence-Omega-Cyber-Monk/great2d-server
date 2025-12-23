import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto, NotificationType } from './notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new notification in database
   */
  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type || NotificationType.GENERAL,
        billId: dto.billId,
        data: dto.data,
      },
      include: {
        bill: {
          select: {
            id: true,
            providerName: true,
            providerEmail: true,
            status: true,
          },
        },
      },
    });

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, limit?: number, offset?: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        bill: {
          select: {
            id: true,
            providerName: true,
            providerEmail: true,
            status: true,
            category: true,
          },
        },
      },
    });

    const total = await this.prisma.notification.count({
      where: { userId },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { 
        userId,
        isRead: false 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bill: {
          select: {
            id: true,
            providerName: true,
            providerEmail: true,
            status: true,
            category: true,
          },
        },
      },
    });

    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id: notificationId,
        userId 
      },
      include: {
        bill: {
          select: {
            id: true,
            providerName: true,
            providerEmail: true,
            status: true,
            category: true,
            actualAmount: true,
            negotiatedAmount: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id: notificationId,
        userId 
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { 
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { 
        userId,
        isRead: false 
      },
      data: { 
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'All notifications marked as read',
      count: result.count,
    };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { 
        id: notificationId,
        userId 
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { 
        userId,
        isRead: true 
      },
    });

    return {
      message: 'All read notifications deleted',
      count: result.count,
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { 
        userId,
        isRead: false 
      },
    });

    return { unreadCount: count };
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(userId: string, type: NotificationType) {
    const notifications = await this.prisma.notification.findMany({
      where: { 
        userId,
        type 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bill: {
          select: {
            id: true,
            providerName: true,
            providerEmail: true,
            status: true,
            category: true,
          },
        },
      },
    });

    return {
      type,
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Get recent notifications (last 24 hours)
   */
  async getRecentNotifications(userId: string) {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const notifications = await this.prisma.notification.findMany({
      where: { 
        userId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bill: {
          select: {
            id: true,
            providerName: true,
            providerEmail: true,
            status: true,
          },
        },
      },
    });

    return {
      count: notifications.length,
      notifications,
    };
  }
}