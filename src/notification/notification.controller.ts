import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { NotificationType } from './notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ 
    status: 200, 
    description: 'List of notifications with pagination',
    schema: {
      type: 'object',
      properties: {
        notifications: { type: 'array' },
        total: { type: 'number' },
        unreadCount: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllNotifications(
    @GetUser('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationService.getUserNotifications(
      userId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get all unread notifications' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of unread notifications',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        notifications: { type: 'array' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadNotifications(@GetUser('userId') userId: string) {
    return this.notificationService.getUnreadNotifications(userId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ 
    status: 200, 
    description: 'Unread notification count',
    schema: {
      type: 'object',
      properties: {
        unreadCount: { type: 'number', example: 5 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@GetUser('userId') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent notifications (last 24 hours)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Recent notifications',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        notifications: { type: 'array' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecentNotifications(@GetUser('userId') userId: string) {
    return this.notificationService.getRecentNotifications(userId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get notifications by type' })
  @ApiParam({ 
    name: 'type', 
    enum: NotificationType,
    example: NotificationType.BILL_STATUS_CHANGE
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notifications filtered by type',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        count: { type: 'number' },
        notifications: { type: 'array' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationsByType(
    @GetUser('userId') userId: string,
    @Param('type') type: NotificationType,
  ) {
    return this.notificationService.getNotificationsByType(userId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationById(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.getNotificationById(userId, id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ 
    status: 200, 
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        count: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@GetUser('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteNotification(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.deleteNotification(userId, id);
  }

  @Delete('read/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ 
    status: 200, 
    description: 'All read notifications deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        count: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAllRead(@GetUser('userId') userId: string) {
    return this.notificationService.deleteAllRead(userId);
  }
}