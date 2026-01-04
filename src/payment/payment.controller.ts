import * as common from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';

@ApiTags('Payment')
@common.Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @common.Post('create-payment-intent')
  @common.HttpCode(common.HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a payment intent',
    description: 'Creates a Stripe payment intent for processing payments',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
    type: PaymentIntentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createPaymentIntent(
    @common.Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentService.createPaymentIntent(
      createPaymentIntentDto.amount,
      createPaymentIntentDto.currency || 'usd',
    );
  }

  @common.Post('create-customer')
  @common.HttpCode(common.HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Stripe customer',
    description: 'Creates a new customer in Stripe for future payments',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or customer data',
  })
  async createCustomer(
    @common.Body() createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.paymentService.createCustomer(
      createCustomerDto.email,
      createCustomerDto.name,
    );
  }

  @common.Get('payment-intent/:id')
  @ApiOperation({
    summary: 'Get payment intent details',
    description: 'Retrieves details of a specific payment intent',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment intent ID',
    example: 'pi_xxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment intent details retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment intent not found',
  })
  async getPaymentIntent(@common.Param('id') id: string) {
    return this.paymentService.getPaymentIntent(id);
  }

  @common.Post('webhook')
  @common.HttpCode(common.HttpStatus.OK)
  @ApiExcludeEndpoint() // Exclude from Swagger as it's for Stripe webhooks
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
  })
  async handleWebhook(
    @common.Headers('stripe-signature') signature: string,
    @common.Req() request: common.RawBodyRequest<Request>,
  ): Promise<WebhookResponseDto> {
    return this.paymentService.handleWebhook(signature, request.rawBody || Buffer.alloc(0));
  }
}