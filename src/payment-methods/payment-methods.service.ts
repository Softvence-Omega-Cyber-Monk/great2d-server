import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/payment-methods.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentMethodDto) {
    // If this is set as default, unset other default payment methods
    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Mask card number (show only last 4 digits)
    const maskedCardNumber = this.maskCardNumber(dto.cardNumber);

    return this.prisma.paymentMethod.create({
      data: {
        userId,
        cardHolderName: dto.cardHolderName,
        cardNumber: maskedCardNumber,
        expiryDate: dto.expiryDate,
        cvv: dto.cvv, // In production, this should be encrypted or not stored
        isDefault: dto.isDefault || false,
      },
      select: {
        paymentId: true,
        userId: true,
        cardHolderName: true,
        cardNumber: true,
        expiryDate: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      select: {
        paymentId: true,
        userId: true,
        cardHolderName: true,
        cardNumber: true,
        expiryDate: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { isDefault: 'desc' },
    });
  }

  async findOne(paymentId: string, userId: string) {
    const payment = await this.prisma.paymentMethod.findUnique({
      where: { paymentId },
      select: {
        paymentId: true,
        userId: true,
        cardHolderName: true,
        cardNumber: true,
        expiryDate: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment method not found');
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this payment method',
      );
    }

    return payment;
  }

  async update(
    paymentId: string,
    userId: string,
    dto: UpdatePaymentMethodDto,
  ) {
    // Check if payment method exists and belongs to user
    await this.findOne(paymentId, userId);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true, paymentId: { not: paymentId } },
        data: { isDefault: false },
      });
    }

    // Mask card number if provided
    const updateData = { ...dto };
    if (dto.cardNumber) {
      updateData.cardNumber = this.maskCardNumber(dto.cardNumber);
    }

    return this.prisma.paymentMethod.update({
      where: { paymentId },
      data: updateData,
      select: {
        paymentId: true,
        userId: true,
        cardHolderName: true,
        cardNumber: true,
        expiryDate: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(paymentId: string, userId: string) {
    // Check if payment method exists and belongs to user
    await this.findOne(paymentId, userId);

    await this.prisma.paymentMethod.delete({
      where: { paymentId },
    });

    return { message: 'Payment method deleted successfully' };
  }

  private maskCardNumber(cardNumber: string): string {
    return `****${cardNumber.slice(-4)}`;
  }
}