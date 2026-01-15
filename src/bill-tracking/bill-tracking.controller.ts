// ============================================
// FILE: bill-tracking.controller.ts
// ============================================

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { BillTrackingService } from './bill-tracking.service';
import {
  CreateBillTrackingDto,
  UpdateBillTrackingDto,
  BillTrackingResponseDto,
  MonthlyBillSummaryDto,
  CreateBillTrackingPublicDto
} from './dto/bill-tracking.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { BillPaymentStatus } from 'generated/prisma';

@ApiTags('Bill Tracking')
@Controller('bill-tracking')
export class BillTrackingController {
  constructor(private readonly billTrackingService: BillTrackingService) {}

  // ============================================
  // PUBLIC ENDPOINTS (No Authentication)
  // ============================================

  @Post('public')
  @ApiOperation({
    summary: 'Create a bill tracking record (Public)',
    description: 'Creates a monthly tracking record for a specific bill without authentication. Requires userId and billId in the request body.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bill tracking record created successfully',
    type: BillTrackingResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or tracking already exists for this month'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill not found'
  })
  createPublic(@Body() createDto: CreateBillTrackingPublicDto) {
    return this.billTrackingService.create(createDto.userId, createDto);
  }

  @Get('public/:userId')
  @ApiOperation({
    summary: 'Get all bill tracking records for a user (Public)',
    description: 'Retrieves all bill tracking records for a specific user without authentication. Can be filtered by month and payment status.'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Filter by month in YYYY-MM format (e.g., 2024-01)',
    example: '2024-01'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by payment status',
    enum: BillPaymentStatus,
    example: BillPaymentStatus.due
  })
  @ApiQuery({
    name: 'billId',
    required: false,
    description: 'Filter by specific bill ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bill tracking records retrieved successfully',
    type: [BillTrackingResponseDto]
  })
  findAllPublic(
    @Param('userId') userId: string,
    @Query('month') month?: string,
    @Query('status') status?: BillPaymentStatus,
    @Query('billId') billId?: string
  ) {
    return this.billTrackingService.findAllPublic(userId, month, status, billId);
  }

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Create a new bill tracking record',
    description: 'Creates a monthly tracking record for a specific bill. This allows users to track payment status for bills on a month-by-month basis.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bill tracking record created successfully',
    type: BillTrackingResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or tracking already exists for this month'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  create(
    @GetUser('userId') userId: string,
    @Body() createDto: CreateBillTrackingDto
  ) {
    return this.billTrackingService.create(userId, createDto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get all bill tracking records',
    description: 'Retrieves all bill tracking records for the authenticated user. Can be filtered by month and payment status using query parameters.'
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Filter by month in YYYY-MM format (e.g., 2024-01)',
    example: '2024-01'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by payment status',
    enum: BillPaymentStatus,
    example: BillPaymentStatus.due
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bill tracking records retrieved successfully',
    type: [BillTrackingResponseDto]
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  findAll(
    @GetUser('userId') userId: string,
    @Query('month') month?: string,
    @Query('status') status?: BillPaymentStatus
  ) {
    return this.billTrackingService.findAll(userId, month, status);
  }

  @Get('summary/:month')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get monthly bill summary',
    description: 'Retrieves a summary of all bills for a specific month, including total bills, paid/due/overdue counts, and total amounts.'
  })
  @ApiParam({
    name: 'month',
    description: 'Month in YYYY-MM format',
    example: '2024-01'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monthly summary retrieved successfully',
    type: MonthlyBillSummaryDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid month format'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  getMonthlySummary(
    @GetUser('userId') userId: string,
    @Param('month') month: string
  ) {
    return this.billTrackingService.getMonthlySummary(userId, month);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get a specific bill tracking record',
    description: 'Retrieves detailed information about a specific bill tracking record by its ID.'
  })
  @ApiParam({
    name: 'id',
    description: 'Bill tracking record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bill tracking record retrieved successfully',
    type: BillTrackingResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill tracking record not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  findOne(
    @GetUser('userId') userId: string,
    @Param('id') id: string
  ) {
    return this.billTrackingService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Update a bill tracking record',
    description: 'Updates a bill tracking record. Commonly used to change payment status, update amounts, or modify due dates.'
  })
  @ApiParam({
    name: 'id',
    description: 'Bill tracking record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bill tracking record updated successfully',
    type: BillTrackingResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill tracking record not found'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  update(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateBillTrackingDto
  ) {
    return this.billTrackingService.update(userId, id, updateDto);
  }

  @Patch(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Mark a bill as paid',
    description: 'Marks a bill tracking record as paid with the current timestamp. This is a convenience endpoint for the most common update operation.'
  })
  @ApiParam({
    name: 'id',
    description: 'Bill tracking record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bill marked as paid successfully',
    type: BillTrackingResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill tracking record not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  markAsPaid(
    @GetUser('userId') userId: string,
    @Param('id') id: string
  ) {
    return this.billTrackingService.markAsPaid(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Delete a bill tracking record',
    description: 'Permanently deletes a bill tracking record. This does not affect the original bill, only the monthly tracking entry.'
  })
  @ApiParam({
    name: 'id',
    description: 'Bill tracking record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Bill tracking record deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bill tracking record not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated'
  })
  remove(
    @GetUser('userId') userId: string,
    @Param('id') id: string
  ) {
    return this.billTrackingService.remove(userId, id);
  }
}