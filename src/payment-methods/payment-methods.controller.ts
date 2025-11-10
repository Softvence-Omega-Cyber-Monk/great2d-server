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
import { PaymentMethodsService } from './payment-methods.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-methods.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Payment Methods')
@Controller('payment-methods')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiResponse({
    status: 201,
    description: 'Payment method created successfully',
    type: PaymentMethodResponseDto,
  })
  create(
    @GetUser('userId') userId: string,
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.create(userId, createPaymentMethodDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment methods for current user' })
  @ApiResponse({
    status: 200,
    description: 'Return all payment methods',
    type: [PaymentMethodResponseDto],
  })
  findAll(@GetUser('userId') userId: string) {
    return this.paymentMethodsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment method by ID' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: 200,
    description: 'Return payment method',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string, @GetUser('userId') userId: string) {
    return this.paymentMethodsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment method updated successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @GetUser('userId') userId: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(id, userId, updatePaymentMethodDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string, @GetUser('userId') userId: string) {
    return this.paymentMethodsService.remove(id, userId);
  }
}