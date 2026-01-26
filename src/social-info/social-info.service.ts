import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateEmailDto,
  CreatePhoneDto,
  CreateWhatsAppDto,
  UpdateEmailDto, 
  UpdatePhoneDto, 
  UpdateWhatsAppDto
} from './dto/social-info.dto';

@Injectable()
export class SocialInfoService {
  constructor(private prisma: PrismaService) {}

  // Email operations
  async createEmail(createEmailDto: CreateEmailDto) {
    return await this.prisma.email.create({
      data: createEmailDto,
    });
  }

  async findAllEmails() {
    const allEmails = await this.prisma.email.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return allEmails[0];
  }

  async findOneEmail(id: string) {
    const email = await this.prisma.email.findUnique({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Email with ID ${id} not found`);
    }

    return email;
  }

  async removeEmail(id: string) {
    await this.findOneEmail(id);

    await this.prisma.email.delete({
      where: { id },
    });
  }

  // Phone operations
  async createPhone(createPhoneDto: CreatePhoneDto) {
    return await this.prisma.phone.create({
      data: createPhoneDto,
    });
  }

  async findAllPhones() {
    const allPhones = await this.prisma.phone.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return allPhones[0];
  }

  async findOnePhone(id: string) {
    const phone = await this.prisma.phone.findUnique({
      where: { id },
    });

    if (!phone) {
      throw new NotFoundException(`Phone with ID ${id} not found`);
    }

    return phone;
  }

  async updatePhone(id: string, updatePhoneDto: UpdatePhoneDto) {
    await this.findOnePhone(id);

    return await this.prisma.phone.update({
      where: { id },
      data: updatePhoneDto,
    });
  }

  async removePhone(id: string) {
    await this.findOnePhone(id);

    await this.prisma.phone.delete({
      where: { id },
    });
  }

  // WhatsApp operations
  async createWhatsApp(createWhatsAppDto: CreateWhatsAppDto) {
    return await this.prisma.whatsApp.create({
      data: createWhatsAppDto,
    });
  }

  async findAllWhatsApps() {
    const allWp = await this.prisma.whatsApp.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return allWp[0];
  }

  async findOneWhatsApp(id: string) {
    const whatsapp = await this.prisma.whatsApp.findUnique({
      where: { id },
    });

    if (!whatsapp) {
      throw new NotFoundException(`WhatsApp with ID ${id} not found`);
    }

    return whatsapp;
  }

  async updateWhatsApp(id: string, updateWhatsAppDto: UpdateWhatsAppDto) {
    await this.findOneWhatsApp(id);

    return await this.prisma.whatsApp.update({
      where: { id },
      data: updateWhatsAppDto,
    });
  }

  async removeWhatsApp(id: string) {
    await this.findOneWhatsApp(id);

    await this.prisma.whatsApp.delete({
      where: { id },
    });
  }
}