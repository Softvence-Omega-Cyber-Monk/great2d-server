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
} from '@nestjs/common';
import { BillService } from './bills.service';
import { CreateBillDto, UpdateBillDto, SetSavingsGoalDto } from './dto/bill.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Bills')
@Controller('bills')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bill' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by ID' })
  @ApiResponse({ status: 200, description: 'Single bill details' })
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
  @ApiOperation({ summary: 'Update a bill by ID' })
  @ApiResponse({ status: 200, description: 'Bill updated successfully' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.updateBill(userId, id, dto);
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

  @Get('stats/monthly')
  @ApiOperation({ summary: "Get this month's savings summary" })
  @ApiResponse({ status: 200, description: "This month's savings stats" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getThisMonthSavings(@GetUser('userId') userId: string) {
    return this.billService.getThisMonthSavings(userId);
  }

  @Get('stats/alltime')
  @ApiOperation({ summary: 'Get all-time total savings' })
  @ApiResponse({ status: 200, description: 'All-time savings summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAllTimeSavings(@GetUser('userId') userId: string) {
    return this.billService.getAllTimeSavings(userId);
  }

  @Get('stats/categories')
  @ApiOperation({ summary: 'Get savings grouped by category' })
  @ApiResponse({ status: 200, description: 'Savings by category' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSavingsByCategory(@GetUser('userId') userId: string) {
    return this.billService.getSavingsByCategory(userId);
  }

  @Get('stats/breakdown')
  @ApiOperation({ summary: "Get this month's bill breakdown (for dashboard UI)" })
  @ApiResponse({ status: 200, description: 'Monthly bill breakdown' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMonthlyBreakdown(@GetUser('userId') userId: string) {
    return this.billService.getMonthlyBreakdown(userId);
  }
}