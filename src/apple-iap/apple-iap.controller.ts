import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppleIapService } from './apple-iap.service';
import { AppleVerifyDto } from './dto/apple-verify.dto';
import { JwtGuard } from '../auth/guards/jwt.guards';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Apple IAP')
@Controller('apple')
export class AppleIapController {
  constructor(private readonly appleIapService: AppleIapService) {}

  @Post('validate-purchase')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate Apple IAP purchase and sync subscription lifecycle',
    description:
      'Validates the provided transaction and syncs the entire subscription chain from Apple servers. Ensures only one active subscription per user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase validated and subscription synced.',
  })
  @ApiResponse({ status: 400, description: 'Invalid transaction details.' })
  async validatePurchase(
    @GetUser('userId') userId: string,
    @Body() dto: AppleVerifyDto,
  ) {
    return this.appleIapService.validatePurchase(userId, dto);
  }
}
