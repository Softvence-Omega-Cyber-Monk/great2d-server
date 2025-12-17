import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

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
    @ApiProperty({ example: 'provider-uuid-here' })
    @IsUUID()
    @IsNotEmpty()
    providerId: string;

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

// Provider DTOs - Global providers (not user-specific)
export class CreateProviderDto {
    @ApiProperty({ example: 'Comcast' })
    @IsString()
    @IsNotEmpty()
    providerName: string;

    @ApiPropertyOptional({ example: 'support@comcast.com' })
    @IsString()
    @IsOptional()
    contactEmail?: string;

    @ApiPropertyOptional({ example: '1-800-COMCAST' })
    @IsString()
    @IsOptional()
    contactPhone?: string;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}

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