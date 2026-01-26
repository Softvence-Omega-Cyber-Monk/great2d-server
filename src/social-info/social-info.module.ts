import { Module } from '@nestjs/common';
import { SocialInfoService } from './social-info.service';
import { EmailController, PhoneController, WhatsAppController } from './social-info.controller';

@Module({
  controllers: [EmailController, PhoneController, WhatsAppController],
  providers: [SocialInfoService],
  exports: [SocialInfoService],
})
export class SocialInfoModule {}