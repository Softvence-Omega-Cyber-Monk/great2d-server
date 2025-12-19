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
  Query,
} from '@nestjs/common';
import { BillService } from './bills.service';
import { 
  CreateBillDto, 
  UpdateBillDto, 
  SetSavingsGoalDto,
  CreateProviderDto,
  UpdateProviderDto,
  MarkBillAsSentDto
} from './dto/bill.dto';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

// ==================== PROVIDERS CONTROLLER ====================
@ApiTags('Providers')
@Controller('providers')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class ProviderController {
  constructor(private readonly billService: BillService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new provider (Admin/User can add global providers)' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  @ApiResponse({ status: 409, description: 'Provider already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateProviderDto) {
    return this.billService.createProvider(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all providers' })
  @ApiResponse({ status: 200, description: 'List of all providers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAll() {
    return this.billService.getAllProviders();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search providers by name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  search(@Query('q') query: string) {
    return this.billService.searchProviders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider details' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getById(@Param('id') id: string) {
    return this.billService.getProviderById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Provider name already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.billService.updateProvider(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider deleted successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Provider has existing bills' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  delete(@Param('id') id: string) {
    return this.billService.deleteProvider(id);
  }
}

// ==================== BILLS CONTROLLER ====================
@ApiTags('Bills')
@Controller('bills')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT-auth')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bill negotiation' })
  @ApiResponse({ status: 201, description: 'Bill created successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() dto: CreateBillDto,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.createBill(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bills for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of all bills with provider details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAll(@GetUser('userId') userId: string) {
    return this.billService.getAllBills(userId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get bills by status' })
  @ApiParam({ name: 'status', enum: ['draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled'] })
  @ApiResponse({ status: 200, description: 'Bills filtered by status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getByStatus(
    @Param('status') status: string,
    @GetUser('userId') userId: string
  ) {
    return this.billService.getBillsByStatus(userId, status);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary with counts and recent activity' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getDashboardSummary(@GetUser('userId') userId: string) {
    return this.billService.getDashboardSummary(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get bills statistics' })
  @ApiResponse({ status: 200, description: 'Bills stats by status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats(@GetUser('userId') userId: string) {
    return this.billService.getBillsStats(userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent bill activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Recent bill activity' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecent(
    @GetUser('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.billService.getRecentActivity(userId, limit || 10);
  }

  // ==================== NEW ENDPOINTS ====================

  @Get('negotiations/active-count')
  @ApiOperation({ summary: 'Get count of active negotiations (bills with status: negotiating)' })
  @ApiResponse({ status: 200, description: 'Count of active negotiations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActiveNegotiationsCount(@GetUser('userId') userId: string) {
    return this.billService.getActiveNegotiationsCount(userId);
  }

  @Get('negotiations/recent')
  @ApiOperation({ summary: 'Get recent negotiations (bills with status: negotiating, successful, sent)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of recent negotiation bills' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRecentNegotiations(
    @GetUser('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.billService.getRecentNegotiations(userId, limit || 10);
  }

  @Get('savings/this-month')
  @ApiOperation({ summary: 'Get sum of savings for bills that became successful this month' })
  @ApiResponse({ status: 200, description: 'This month savings amount' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getThisMonthSavings(@GetUser('userId') userId: string) {
    return this.billService.getThisMonthSavings(userId);
  }

  @Get('savings/all-time')
  @ApiOperation({ summary: 'Get all-time total savings from successful bills' })
  @ApiResponse({ status: 200, description: 'All-time savings amount' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAllTimeSavings(@GetUser('userId') userId: string) {
    return this.billService.getAllTimeSavings(userId);
  }

  @Get('savings/by-category')
  @ApiOperation({ summary: 'Get savings grouped by category with optional month/year filter' })
  @ApiQuery({ name: 'month', required: false, type: Number, example: 12, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2024, description: 'Year' })
  @ApiResponse({ status: 200, description: 'Savings by category with amounts and percentages' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSavingsByCategory(
    @GetUser('userId') userId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.billService.getSavingsByCategory(userId, month, year);
  }

  // ==================== EXISTING ENDPOINTS ====================

  @Get(':id')
  @ApiOperation({ summary: 'Get bill by ID with tracking history' })
  @ApiResponse({ status: 200, description: 'Single bill details with provider and tracking' })
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

  @Patch(':id/mark-sent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark bill negotiation email as sent' })
  @ApiBody({ type: MarkBillAsSentDto })
  @ApiResponse({ status: 200, description: 'Bill marked as sent' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  markAsSent(
    @Param('id') id: string,
    @Body() body: MarkBillAsSentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.markBillAsSent(
      userId, 
      id, 
      body.emailThreadId, 
      body.emailMessageId
    );
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update bill status' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        status: { 
          type: 'string', 
          enum: ['draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled'] 
        } 
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Bill status updated' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @GetUser('userId') userId: string,
  ) {
    return this.billService.updateBillStatus(userId, id, status);
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
}