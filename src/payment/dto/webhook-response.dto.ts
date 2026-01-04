import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Webhook received status',
    example: true,
  })
  received: boolean;
}