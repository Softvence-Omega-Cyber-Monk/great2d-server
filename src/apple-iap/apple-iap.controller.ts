import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppleIapService } from './apple-iap.service';
import { AppleVerifyDto } from './dto/apple-verify.dto';
import { JwtGuard } from '../auth/guards/jwt.guards';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Apple IAP')
@Controller('apple')
export class AppleIapController {
  constructor(private readonly appleIapService: AppleIapService) { }

  @Post('validate-purchase')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate Apple IAP purchase',
    description: 'Receives JWS from frontend and performs local and server-side verification with Apple servers.',
  })
  @ApiResponse({ status: 200, description: 'Purchase validated and subscription granted.' })
  @ApiResponse({ status: 400, description: 'Invalid transaction details.' })
  async validatePurchase(
    @GetUser('userId') userId: string,
    @Body() dto: AppleVerifyDto,
  ) {
    return this.appleIapService.validatePurchase(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  // @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Apple Server Notifications V2 Webhook',
    description: 'Endpoint for Apple to send real-time subscription lifecycle updates.',
  })
  async handleWebhook(@Body() payload: any) {
    return this.appleIapService.handleWebhook(payload);
  }
}
