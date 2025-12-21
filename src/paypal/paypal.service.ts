// paypal/paypal.service.ts

import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { CreatePayPalPaymentDto, RefundPayPalPaymentDto } from './dto/paypal.dto';
import { PayPalPaymentStatus } from 'generated/prisma';

@Injectable()
export class PayPalService {
  private readonly baseURL: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly returnUrl: string;
  private readonly cancelUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const mode = this.configService.get<string>('paypal.mode');
    this.baseURL = mode === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    
    this.clientId = this.configService.get<string>('paypal.clientId')!;
    this.clientSecret = this.configService.get<string>('paypal.clientSecret')!;
    this.returnUrl = this.configService.get<string>('paypal.returnUrl')!;
    this.cancelUrl = this.configService.get<string>('paypal.cancelUrl')!;
  }

  /**
   * Get PayPal access token
   */
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('PayPal authentication error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to authenticate with PayPal');
    }
  }

  /**
   * Create PayPal order
   */
  async createPayment(userId: string, createDto: CreatePayPalPaymentDto) {
    try {
      const accessToken = await this.getAccessToken();

      // Create PayPal order
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: createDto.currency || 'USD',
              value: createDto.amount.toFixed(2),
            },
            description: createDto.subscriptionName,
          },
        ],
        application_context: {
          return_url: this.returnUrl,
          cancel_url: this.cancelUrl,
          brand_name: 'Your App Name',
          user_action: 'PAY_NOW',
        },
      };

      const response = await axios.post(
        `${this.baseURL}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const orderId = response.data.id;
      const approvalUrl = response.data.links.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      // Save payment record to database
      const payment = await this.prisma.payPalPayment.create({
        data: {
          userId,
          paypalOrderId: orderId,
          amount: createDto.amount,
          currency: createDto.currency || 'USD',
          subscriptionName: createDto.subscriptionName,
          status: PayPalPaymentStatus.pending,
          paypalResponse: response.data,
        },
      });

      return {
        orderId,
        approvalUrl,
        paymentId: payment.id,
      };
    } catch (error) {
      console.error('PayPal order creation error:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to create PayPal order'
      );
    }
  }

  /**
   * Capture PayPal payment
   */
  async capturePayment(userId: string, orderId: string) {
    // Find payment record
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { paypalOrderId: orderId, userId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PayPalPaymentStatus.completed) {
      throw new BadRequestException('Payment already completed');
    }

    if (payment.status === PayPalPaymentStatus.cancelled) {
      throw new BadRequestException('Payment was cancelled');
    }

    try {
      const accessToken = await this.getAccessToken();

      // Capture the order
      const response = await axios.post(
        `${this.baseURL}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const captureData = response.data;
      const captureId = captureData.purchase_units[0]?.payments?.captures[0]?.id;
      const payerEmail = captureData.payer?.email_address;
      const payerName = `${captureData.payer?.name?.given_name || ''} ${captureData.payer?.name?.surname || ''}`.trim();
      const payerId = captureData.payer?.payer_id;

      // Update payment record
      const updatedPayment = await this.prisma.payPalPayment.update({
        where: { id: payment.id },
        data: {
          status: PayPalPaymentStatus.completed,
          paypalPaymentId: captureId,
          payerEmail,
          payerName,
          payerId,
          paypalResponse: captureData,
        },
      });

      return updatedPayment;
    } catch (error) {
      console.error('PayPal capture error:', error.response?.data || error.message);
      
      // Update payment as failed
      await this.prisma.payPalPayment.update({
        where: { id: payment.id },
        data: {
          status: PayPalPaymentStatus.failed,
          errorMessage: error.response?.data?.message || error.message,
        },
      });

      throw new BadRequestException(
        error.response?.data?.message || 'Failed to capture payment'
      );
    }
  }

  /**
   * Get all payments for a user
   */
  async getUserPayments(userId: string) {
    return this.prisma.payPalPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(userId: string, paymentId: string) {
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Refund payment
   */
  async refundPayment(userId: string, refundDto: RefundPayPalPaymentDto) {
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { id: refundDto.paymentId, userId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PayPalPaymentStatus.completed) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    if (!payment.paypalPaymentId) {
      throw new BadRequestException('PayPal payment ID not found');
    }

    try {
      const accessToken = await this.getAccessToken();

      const refundData: any = {
        note_to_payer: refundDto.reason || 'Refund processed',
      };

      if (refundDto.amount) {
        refundData.amount = {
          value: refundDto.amount.toFixed(2),
          currency_code: payment.currency,
        };
      }

      const response = await axios.post(
        `${this.baseURL}/v2/payments/captures/${payment.paypalPaymentId}/refund`,
        refundData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const refundId = response.data.id;

      // Update payment record
      const updatedPayment = await this.prisma.payPalPayment.update({
        where: { id: payment.id },
        data: {
          status: PayPalPaymentStatus.refunded,
          refundId,
          refundedAt: new Date(),
        },
      });

      return updatedPayment;
    } catch (error) {
      console.error('PayPal refund error:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to process refund'
      );
    }
  }

  /**
   * Cancel pending payment
   */
  async cancelPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { id: paymentId, userId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PayPalPaymentStatus.pending) {
      throw new BadRequestException('Only pending payments can be cancelled');
    }

    return this.prisma.payPalPayment.update({
      where: { id: paymentId },
      data: { status: PayPalPaymentStatus.cancelled },
    });
  }

  /**
   * Handle PayPal webhook events
   */
  async handleWebhook(webhookData: any) {
    const eventType = webhookData.event_type;
    const resource = webhookData.resource;

    console.log('PayPal webhook received:', eventType);

    try {
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(resource);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.DECLINED':
          await this.handlePaymentFailed(resource);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePaymentRefunded(resource);
          break;
        default:
          console.log('Unhandled webhook event:', eventType);
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  private async handlePaymentCompleted(resource: any) {
    const captureId = resource.id;
    
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { paypalPaymentId: captureId }
    });

    if (payment && payment.status !== PayPalPaymentStatus.completed) {
      await this.prisma.payPalPayment.update({
        where: { id: payment.id },
        data: { status: PayPalPaymentStatus.completed },
      });
    }
  }

  private async handlePaymentFailed(resource: any) {
    const captureId = resource.id;
    
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { paypalPaymentId: captureId }
    });

    if (payment) {
      await this.prisma.payPalPayment.update({
        where: { id: payment.id },
        data: { 
          status: PayPalPaymentStatus.failed,
          errorMessage: resource.status_details?.reason || 'Payment failed'
        },
      });
    }
  }

  private async handlePaymentRefunded(resource: any) {
    const captureId = resource.id;
    
    const payment = await this.prisma.payPalPayment.findFirst({
      where: { paypalPaymentId: captureId }
    });

    if (payment) {
      await this.prisma.payPalPayment.update({
        where: { id: payment.id },
        data: { 
          status: PayPalPaymentStatus.refunded,
          refundedAt: new Date()
        },
      });
    }
  }
}