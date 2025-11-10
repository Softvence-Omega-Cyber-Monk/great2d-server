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
} from './dto/subscription-plan.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiResponse({
    status: 201,
    description: 'Subscription plan created successfully',
    type: SubscriptionPlanResponseDto,
  })
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
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan updated successfully',
    type: SubscriptionPlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  remove(@Param('id') id: string) {
    return this.subscriptionPlansService.remove(id);
  }

  @Post('subscribe')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 200, description: 'Subscribed successfully' })
  @ApiResponse({ status: 404, description: 'Plan or user not found' })
  subscribe(
    @GetUser('userId') userId: string,
    @Body() subscribeDto: SubscribeDto,
  ) {
    return this.subscriptionPlansService.subscribe(
      userId,
      subscribeDto.subscriptionPlanId,
    );
  }

  @Post('unsubscribe')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unsubscribe from current plan' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unsubscribe(@GetUser('userId') userId: string) {
    return this.subscriptionPlansService.unsubscribe(userId);
  }
}