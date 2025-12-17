// paypal/paypal.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PayPalService } from './paypal.service';
import {
  CreatePayPalPaymentDto,
  CapturePayPalPaymentDto,
  RefundPayPalPaymentDto,
  PayPalPaymentResponseDto,
  PayPalOrderResponseDto,
  PayPalWebhookDto,
} from './dto/paypal.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guards';

@ApiTags('PayPal Payments')
@Controller('paypal')
export class PayPalController {
  constructor(private readonly paypalService: PayPalService) {}

  @Post('create-payment')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a PayPal payment order',
    description: 'Creates a new PayPal order and returns the approval URL where the user should be redirected to complete the payment. The order is created in pending status and must be captured after user approval.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'PayPal order created successfully. Redirect user to the approval URL.',
    type: PayPalOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data or PayPal API error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill tracking or subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to authenticate with PayPal or internal server error',
  })
  async createPayment(
    @Request() req,
    @Body() createDto: CreatePayPalPaymentDto,
  ) {
    return this.paypalService.createPayment(req.user.userId, createDto);
  }

  @Post('capture-payment')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Capture a PayPal payment',
    description: 'Captures (completes) a PayPal payment after the user has approved it. This should be called after the user returns from the PayPal approval page. If the payment is for a bill, it will automatically mark the bill as paid. If for a subscription, it will activate the subscription.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment captured successfully',
    type: PayPalPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment already completed, cancelled, or capture failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment order not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  async capturePayment(
    @Request() req,
    @Body() captureDto: CapturePayPalPaymentDto,
  ) {
    return this.paypalService.capturePayment(req.user.userId, captureDto.orderId);
  }

  @Get('payments')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all user payments',
    description: 'Retrieves all PayPal payment records for the authenticated user, including associated bill tracking and subscription information. Results are ordered by creation date (newest first).'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payments retrieved successfully',
    type: [PayPalPaymentResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  async getUserPayments(@Request() req) {
    return this.paypalService.getUserPayments(req.user.userId);
  }

  @Get('payments/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Retrieves detailed information about a specific PayPal payment, including the full PayPal response, payer information, and related bill or subscription data.'
  })
  @ApiParam({
    name: 'id',
    description: 'Payment record ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment details retrieved successfully',
    type: PayPalPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  async getPaymentDetails(@Request() req, @Param('id') id: string) {
    return this.paypalService.getPaymentDetails(req.user.userId, id);
  }

  @Post('refund')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refund a payment',
    description: 'Issues a full or partial refund for a completed PayPal payment. Only completed payments can be refunded. If the payment was for a bill, the bill status will be reverted to "due". You can specify a partial refund amount or leave it empty for a full refund.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund processed successfully',
    type: PayPalPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment cannot be refunded (not completed, already refunded, or refund failed)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  async refundPayment(
    @Request() req,
    @Body() refundDto: RefundPayPalPaymentDto,
  ) {
    return this.paypalService.refundPayment(req.user.userId, refundDto);
  }

  @Post('cancel/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a pending payment',
    description: 'Cancels a pending PayPal payment that has not yet been captured. Only pending payments can be cancelled. This is useful when a user abandons the payment flow or decides not to proceed.'
  })
  @ApiParam({
    name: 'id',
    description: 'Payment record ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment cancelled successfully',
    type: PayPalPaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only pending payments can be cancelled',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  async cancelPayment(@Request() req, @Param('id') id: string) {
    return this.paypalService.cancelPayment(req.user.userId, id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PayPal webhook endpoint',
    description: 'Receives webhook notifications from PayPal about payment events such as completed payments, refunds, and failures. This endpoint should be configured in your PayPal Developer Dashboard. It does not require authentication as PayPal sends the requests directly.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook data',
  })
  async handleWebhook(@Body() webhookData: PayPalWebhookDto) {
    await this.paypalService.handleWebhook(webhookData);
    return { message: 'Webhook processed successfully' };
  }
}