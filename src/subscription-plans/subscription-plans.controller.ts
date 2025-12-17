import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscriptionPlanResponseDto,
  SubscribeDto,
  SubscriptionResponseDto,
} from './dto/subscription-plan.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'generated/prisma';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new subscription plan (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Subscription plan created successfully',
    type: SubscriptionPlanResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(createSubscriptionPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Return all subscription plans',
    type: [SubscriptionPlanResponseDto],
  })
  findAll() {
    return this.subscriptionPlansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Return subscription plan',
    type: SubscriptionPlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update subscription plan (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan updated successfully',
    type: SubscriptionPlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete subscription plan (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  remove(@Param('id') id: string) {
    return this.subscriptionPlansService.remove(id);
  }

  @Post('subscribe')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({
    status: 201,
    description: 'Subscribed successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan or user not found' })
  @ApiResponse({ status: 400, description: 'User already has active subscription' })
  @ApiResponse({ status: 409, description: 'Transaction ID already exists' })
  subscribe(
    @GetUser('userId') userId: string,
    @Body() subscribeDto: SubscribeDto,
  ) {
    return this.subscriptionPlansService.subscribe(userId, subscribeDto);
  }

  @Post('unsubscribe')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unsubscribe from current plan' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'No active subscription found' })
  unsubscribe(@GetUser('userId') userId: string) {
    return this.subscriptionPlansService.unsubscribe(userId);
  }

  @Get('user/me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my active subscription' })
  @ApiResponse({
    status: 200,
    description: 'Return user subscription',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  getMySubscription(@GetUser('userId') userId: string) {
    return this.subscriptionPlansService.getUserSubscription(userId);
  }

  @Get('user/:userId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user active subscription (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return user subscription',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User or subscription not found' })
  getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionPlansService.getUserSubscription(userId);
  }

  @Delete('cleanup/expired')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Clean up all expired subscriptions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Expired subscriptions cleaned up',
  })
  cleanupExpiredSubscriptions() {
    return this.subscriptionPlansService.cleanupExpiredSubscriptions();
  }
}