// bill-tracking.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
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
  MonthlyBillSummaryDto
} from './dto/bill-tracking.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guards';

@ApiTags('Bill Tracking')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('bill-tracking')
export class BillTrackingController {
  constructor(private readonly billTrackingService: BillTrackingService) {}

  @Post()
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
  create(@Request() req, @Body() createDto: CreateBillTrackingDto) {
    return this.billTrackingService.create(req.user.userId, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all bill tracking records',
    description: 'Retrieves all bill tracking records for the authenticated user. Can be filtered by month using the query parameter.'
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Filter by month in YYYY-MM format (e.g., 2024-01)',
    example: '2024-01'
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
  findAll(@Request() req, @Query('month') month?: string) {
    return this.billTrackingService.findAll(req.user.userId, month);
  }

  @Get('summary/:month')
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
  getMonthlySummary(@Request() req, @Param('month') month: string) {
    return this.billTrackingService.getMonthlySummary(req.user.userId, month);
  }

  @Get(':id')
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
  findOne(@Request() req, @Param('id') id: string) {
    return this.billTrackingService.findOne(req.user.userId, id);
  }

  @Patch(':id')
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
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateBillTrackingDto
  ) {
    return this.billTrackingService.update(req.user.userId, id, updateDto);
  }

  @Patch(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
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
  markAsPaid(@Request() req, @Param('id') id: string) {
    return this.billTrackingService.markAsPaid(req.user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  remove(@Request() req, @Param('id') id: string) {
    return this.billTrackingService.remove(req.user.userId, id);
  }
}