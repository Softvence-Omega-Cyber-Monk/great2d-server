import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BillService } from './bills.service';
import { 
  CreateBillDto, 
  UpdateBillDto, 
  SetSavingsGoalDto,
  MarkBillAsSentDto
} from './dto/bill.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

// ==================== BILLS CONTROLLER ====================
@ApiTags('Bills')
@Controller('bills')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class BillController {
  constructor(
    private readonly billService: BillService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bill negotiation' })
  @ApiResponse({ status: 201, description: 'Bill created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() dto: CreateBillDto,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.createBill(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bills for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of all bills' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAll(@GetUser('userId') userId: string) {
    return this.billService.getAllBills(userId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get bills by status' })
  @ApiParam({ name: 'status', enum: ['draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled'] })
  @ApiResponse({ status: 200, description: 'Bills filtered by status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getByStatus(
    @Param('status') status: string,
    @GetUser('userId') userId: string
  ) {
    return this.billService.getBillsByStatus(userId, status);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary with counts and recent activity' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getDashboardSummary(@GetUser('userId') userId: string) {
    return this.billService.getDashboardSummary(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get bills statistics' })
  @ApiResponse({ status: 200, description: 'Bills stats by status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@GetUser('userId') userId: string) {
    return this.billService.getBillsStats(userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent bill activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Recent bill activity' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecent(
    @GetUser('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.billService.getRecentActivity(userId, limit || 10);
  }

  // ==================== NEW ENDPOINTS ====================

  @Get('negotiations/active-count')
  @ApiOperation({ summary: 'Get count of active negotiations (bills with status: negotiating)' })
  @ApiResponse({ status: 200, description: 'Count of active negotiations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActiveNegotiationsCount(@GetUser('userId') userId: string) {
    return this.billService.getActiveNegotiationsCount(userId);
  }

  @Get('negotiations/recent')
  @ApiOperation({ summary: 'Get recent negotiations (bills with status: negotiating, successful, sent)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of recent negotiation bills' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecentNegotiations(
    @GetUser('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.billService.getRecentNegotiations(userId, limit || 10);
  }

  @Get('savings/this-month')
  @ApiOperation({ 
    summary: 'Get sum of savings for bills that became successful this month',
    description: 'Calculates savings as (actualAmount - negotiatedAmount) for all successful bills updated this month'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'This month savings amount',
    schema: {
      type: 'object',
      properties: {
        month: { type: 'number', example: 12 },
        year: { type: 'number', example: 2024 },
        totalSavings: { type: 'number', example: 450.00 },
        billsCount: { type: 'number', example: 3 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getThisMonthSavings(@GetUser('userId') userId: string) {
    return this.billService.getThisMonthSavings(userId);
  }

  @Get('savings/all-time')
  @ApiOperation({ 
    summary: 'Get all-time total savings from successful bills',
    description: 'Calculates total savings as sum of (actualAmount - negotiatedAmount) for all successful bills'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All-time savings amount',
    schema: {
      type: 'object',
      properties: {
        totalSavings: { type: 'number', example: 2500.00 },
        successfulBillsCount: { type: 'number', example: 15 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAllTimeSavings(@GetUser('userId') userId: string) {
    return this.billService.getAllTimeSavings(userId);
  }

  @Get('savings/by-category')
  @ApiOperation({ 
    summary: 'Get savings grouped by provider with optional month/year filter',
    description: 'Groups savings by provider email, calculating (actualAmount - negotiatedAmount) for each'
  })
  @ApiQuery({ name: 'month', required: false, type: Number, example: 12, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2024, description: 'Year' })
  @ApiResponse({ 
    status: 200, 
    description: 'Savings by provider with amounts and percentages',
    schema: {
      type: 'object',
      properties: {
        period: { 
          oneOf: [
            { type: 'string', example: 'all-time' },
            { type: 'object', properties: { month: { type: 'number' }, year: { type: 'number' } } }
          ]
        },
        totalSavings: { type: 'number', example: 1200.00 },
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              providerEmail: { type: 'string', example: 'support@comcast.com' },
              providerName: { type: 'string', example: 'Comcast' },
              savingsAmount: { type: 'number', example: 450.00 },
              percentage: { type: 'number', example: 37.50 }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSavingsByCategory(
    @GetUser('userId') userId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.billService.getSavingsByCategory(userId, month, year);
  }

  // ==================== FIREBASE NOTIFICATION ENDPOINTS ====================

  @Get('notifications/all')
  @ApiOperation({ 
    summary: 'Get FCM device token for current user',
    description: 'Get the registered FCM token for the logged-in user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Current user FCM token information',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'uuid-here' },
        email: { type: 'string', example: 'user@example.com' },
        fcmToken: { type: 'string', example: 'fZj8X...' },
        isRegistered: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAllNotificationTokens(@GetUser('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        fcmToken: true
      }
    });

    if (!user) {
      return {
        userId,
        email: null,
        fcmToken: null,
        isRegistered: false
      };
    }

    return {
      userId: user.userId,
      email: user.email,
      fcmToken: user.fcmToken,
      isRegistered: !!user.fcmToken
    };
  }

  @Get('notifications/status')
  @ApiOperation({ 
    summary: 'Check if current user device is registered for notifications',
    description: 'Check if the current user has a registered FCM token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification status',
    schema: {
      type: 'object',
      properties: {
        isRegistered: { type: 'boolean', example: true },
        hasToken: { type: 'boolean', example: true },
        fcmToken: { type: 'string', example: 'fZj8X...' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationStatus(@GetUser('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { fcmToken: true }
    });

    return {
      isRegistered: !!user?.fcmToken,
      hasToken: !!user?.fcmToken,
      fcmToken: user?.fcmToken || null
    };
  }

  // ==================== EXISTING ENDPOINTS ====================

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by ID with tracking history' })
  @ApiResponse({ status: 200, description: 'Single bill details with tracking' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getById(
    @Param('id') id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.getBillById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a bill by ID (can also update FCM token)',
    description: 'Update bill details including actualAmount and negotiatedAmount. If status changes, a push notification will be sent. Can also update FCM token by including it in the request body.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        providerEmail: { type: 'string', example: 'support@provider.com' },
        providerName: { type: 'string', example: 'Provider Name' },
        accountDetails: { type: 'string', example: 'Account #12345' },
        negotiationRecommendation: { type: 'string' },
        emailSubject: { type: 'string' },
        emailBody: { type: 'string' },
        emailThreadId: { type: 'string' },
        emailMessageId: { type: 'string' },
        status: { 
          type: 'string', 
          enum: ['draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled']
        },
        sentAt: { type: 'string', format: 'date-time' },
        actualAmount: { type: 'integer', example: 150, description: 'Original bill amount before negotiation' },
        negotiatedAmount: { type: 'integer', example: 120, description: 'Negotiated bill amount after successful negotiation' },
        fcmToken: { 
          type: 'string', 
          example: 'fZj8X9kS3hY:APA91bF7Z...',
          description: 'Optional: Update FCM token for push notifications'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Bill updated successfully, notification sent if status changed' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBillDto & { fcmToken?: string },
    @GetUser('userId') userId: string,
  ) {
    // If FCM token is provided, update it in user table
    if (dto.fcmToken) {
      await this.prisma.user.update({
        where: { userId },
        data: { fcmToken: dto.fcmToken }
      });
    }

    // Update the bill (this will trigger notification if status changed)
    return this.billService.updateBill(userId, id, dto);
  }

  @Patch(':id/mark-sent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark bill negotiation email as sent (triggers notification)' })
  @ApiBody({ type: MarkBillAsSentDto })
  @ApiResponse({ status: 200, description: 'Bill marked as sent, notification sent' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  markAsSent(
    @Param('id') id: string,
    @Body() body: MarkBillAsSentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.markBillAsSent(
      userId, 
      id, 
      body.emailThreadId, 
      body.emailMessageId
    );
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update bill status (triggers notification)' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        status: { 
          type: 'string', 
          enum: ['draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled'] 
        } 
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Bill status updated, notification sent' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.updateBillStatus(userId, id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bill by ID' })
  @ApiResponse({ status: 200, description: 'Bill deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  delete(
    @Param('id') id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.deleteBill(userId, id);
  }

  @Post('goals/monthly')
  @ApiOperation({ summary: 'Set monthly savings goal' })
  @ApiResponse({ status: 200, description: 'Savings goal set successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  setSavingsGoal(
    @Body() dto: SetSavingsGoalDto,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.setSavingsGoal(userId, dto);
  }

  @Get('goals/monthly')
  @ApiOperation({ summary: 'Get current monthly savings goal' })
  @ApiResponse({ status: 200, description: 'Current savings goal' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSavingsGoal(@GetUser('userId') userId: string) {
    return this.billService.getSavingsGoal(userId);
  }
}