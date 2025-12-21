import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export enum BillCategory {
    INTERNET = 'internet',
    ELECTRICITY = 'electricity',
    WATER = 'water',
    MOBILE = 'mobile',
    GAS = 'gas',
    OTHER = 'other'
}

export enum BillStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    NEGOTIATING = 'negotiating',
    SUCCESSFUL = 'successful',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export class CreateBillDto {
    @ApiProperty({ example: 'support@comcast.com' })
    @IsEmail()
    @IsNotEmpty()
    providerEmail: string;

    @ApiPropertyOptional({ example: 'Comcast' })
    @IsString()
    @IsOptional()
    providerName?: string;

    @ApiPropertyOptional({ example: 'Account #12345' })
    @IsString()
    @IsOptional()
    accountDetails?: string;

    @ApiPropertyOptional({ example: 'Based on your usage patterns, we recommend negotiating for a 15% discount...' })
    @IsString()
    @IsOptional()
    negotiationRecommendation?: string;

    @ApiPropertyOptional({ example: 'Request for Rate Review - Account #12345' })
    @IsString()
    @IsOptional()
    emailSubject?: string;

    @ApiPropertyOptional({ example: 'Dear Customer Service Team...' })
    @IsString()
    @IsOptional()
    emailBody?: string;

    @ApiProperty({ example: BillStatus.DRAFT, enum: BillStatus, default: BillStatus.DRAFT })
    @IsEnum(BillStatus)
    @IsOptional()
    status?: BillStatus;
}

export class UpdateBillDto extends PartialType(CreateBillDto) {
    @ApiPropertyOptional({ example: 'thread_id_123' })
    @IsString()
    @IsOptional()
    emailThreadId?: string;

    @ApiPropertyOptional({ example: 'message_id_456' })
    @IsString()
    @IsOptional()
    emailMessageId?: string;

    @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
    @IsOptional()
    sentAt?: Date;
}

export class SetSavingsGoalDto {
    @ApiProperty({ example: 500.00, description: 'Monthly savings goal amount' })
    @IsNumber()
    @Min(0)
    goalAmount: number;
}

export class MarkBillAsSentDto {
    @ApiPropertyOptional({ example: 'thread_abc123' })
    @IsString()
    @IsOptional()
    emailThreadId?: string;

    @ApiPropertyOptional({ example: 'msg_xyz789' })
    @IsString()
    @IsOptional()
    emailMessageId?: string;
}