import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SocialInfoService } from './social-info.service';
import { 
  CreateEmailDto,
  CreatePhoneDto,
  CreateWhatsAppDto,
  UpdateEmailDto, 
  UpdatePhoneDto, 
  UpdateWhatsAppDto 
} from './dto/social-info.dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly socialInfoService: SocialInfoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create email',
    description: 'Add a new email address to the database'
  })
  @ApiResponse({ status: 201, description: 'Email successfully created' })
  create(@Body() createEmailDto: CreateEmailDto) {
    return this.socialInfoService.createEmail(createEmailDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all emails' })
  @ApiResponse({ status: 200, description: 'List of all emails' })
  findAll() {
    return this.socialInfoService.findAllEmails();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email by ID' })
  @ApiParam({ name: 'id', description: 'Email ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Email found' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  findOne(@Param('id') id: string) {
    return this.socialInfoService.findOneEmail(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete email' })
  @ApiParam({ name: 'id', description: 'Email ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Email deleted' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  remove(@Param('id') id: string) {
    return this.socialInfoService.removeEmail(id);
  }
}

@ApiTags('Phone')
@Controller('phone')
export class PhoneController {
  constructor(private readonly socialInfoService: SocialInfoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create phone',
    description: 'Add a new phone number to the database'
  })
  @ApiResponse({ status: 201, description: 'Phone successfully created' })
  create(@Body() createPhoneDto: CreatePhoneDto) {
    return this.socialInfoService.createPhone(createPhoneDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all phones' })
  @ApiResponse({ status: 200, description: 'List of all phones' })
  findAll() {
    return this.socialInfoService.findAllPhones();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get phone by ID' })
  @ApiParam({ name: 'id', description: 'Phone ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Phone found' })
  @ApiResponse({ status: 404, description: 'Phone not found' })
  findOne(@Param('id') id: string) {
    return this.socialInfoService.findOnePhone(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update phone' })
  @ApiParam({ name: 'id', description: 'Phone ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Phone updated' })
  @ApiResponse({ status: 404, description: 'Phone not found' })
  update(@Param('id') id: string, @Body() updatePhoneDto: UpdatePhoneDto) {
    return this.socialInfoService.updatePhone(id, updatePhoneDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete phone' })
  @ApiParam({ name: 'id', description: 'Phone ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Phone deleted' })
  @ApiResponse({ status: 404, description: 'Phone not found' })
  remove(@Param('id') id: string) {
    return this.socialInfoService.removePhone(id);
  }
}

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly socialInfoService: SocialInfoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create WhatsApp',
    description: 'Add a new WhatsApp number to the database'
  })
  @ApiResponse({ status: 201, description: 'WhatsApp successfully created' })
  create(@Body() createWhatsAppDto: CreateWhatsAppDto) {
    return this.socialInfoService.createWhatsApp(createWhatsAppDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all WhatsApp numbers' })
  @ApiResponse({ status: 200, description: 'List of all WhatsApp numbers' })
  findAll() {
    return this.socialInfoService.findAllWhatsApps();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get WhatsApp by ID' })
  @ApiParam({ name: 'id', description: 'WhatsApp ID (UUID)' })
  @ApiResponse({ status: 200, description: 'WhatsApp found' })
  @ApiResponse({ status: 404, description: 'WhatsApp not found' })
  findOne(@Param('id') id: string) {
    return this.socialInfoService.findOneWhatsApp(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update WhatsApp' })
  @ApiParam({ name: 'id', description: 'WhatsApp ID (UUID)' })
  @ApiResponse({ status: 200, description: 'WhatsApp updated' })
  @ApiResponse({ status: 404, description: 'WhatsApp not found' })
  update(@Param('id') id: string, @Body() updateWhatsAppDto: UpdateWhatsAppDto) {
    return this.socialInfoService.updateWhatsApp(id, updateWhatsAppDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete WhatsApp' })
  @ApiParam({ name: 'id', description: 'WhatsApp ID (UUID)' })
  @ApiResponse({ status: 204, description: 'WhatsApp deleted' })
  @ApiResponse({ status: 404, description: 'WhatsApp not found' })
  remove(@Param('id') id: string) {
    return this.socialInfoService.removeWhatsApp(id);
  }
}