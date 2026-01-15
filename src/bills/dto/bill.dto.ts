import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

// Removed enums - now just using strings

export class CreateBillDto {
    @ApiProperty({ example: 'support@comcast.com' })
    @IsEmail()
    @IsNotEmpty()
    providerEmail: string;

    @ApiPropertyOptional({ example: 'Comcast' })
    @IsString()
    @IsOptional()
    providerName?: string;

    @ApiProperty({ 
        example: 'internet',
        description: 'Bill category (internet, electricity, water, mobile, gas, tv, streaming, insurance, other, etc.)',
        default: 'other'
    })
    @IsString()
    @IsOptional()
    category?: string;

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

    @ApiProperty({ 
        example: 'draft',
        description: 'Bill status (draft, sent, negotiating, successful, failed, cancelled)',
        default: 'draft'
    })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ example: 150, description: 'Original bill amount before negotiation' })
    @IsInt()
    @Min(0)
    @IsOptional()
    actualAmount?: number;

    @ApiPropertyOptional({ example: 120, description: 'Negotiated bill amount after successful negotiation' })
    @IsInt()
    @Min(0)
    @IsOptional()
    negotiatedAmount?: number;
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

    @ApiProperty({ 
        example: 'internet',
        description: 'Bill category (internet, electricity, water, mobile, gas, tv, streaming, insurance, other, etc.)',
        required: false
    })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ example: 150, description: 'Original bill amount before negotiation' })
    @IsInt()
    @Min(0)
    @IsOptional()
    actualAmount?: number;

    @ApiPropertyOptional({ example: 120, description: 'Negotiated bill amount after successful negotiation' })
    @IsInt()
    @Min(0)
    @IsOptional()
    negotiatedAmount?: number;
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

export class UpdateFCMTokenDto {
    @ApiProperty({ 
        example: 'fZj8X9kS3hY:APA91bF7Z...',
        description: 'Firebase Cloud Messaging device token'
    })
    @IsString()
    @IsNotEmpty()
    fcmToken: string;
}

// New DTO for public status update (no authentication required)
export class PublicUpdateStatusDto {
    @ApiProperty({ 
        example: 'user-uuid-here',
        description: 'User ID who owns the bill'
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ 
        example: 'bill-uuid-here',
        description: 'Bill ID to update'
    })
    @IsString()
    @IsNotEmpty()
    billId: string;

    @ApiProperty({ 
        example: 'negotiating',
        description: 'New status (draft, sent, negotiating, successful, failed, cancelled)'
    })
    @IsString()
    @IsNotEmpty()
    status: string;

    @ApiPropertyOptional({ 
        example: 150,
        description: 'Original bill amount (optional)'
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    actualAmount?: number;

    @ApiPropertyOptional({ 
        example: 120,
        description: 'Negotiated bill amount (optional)'
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    negotiatedAmount?: number;
}

// NEW DTO for Email Replies
export class CreateEmailReplyDto {
    @ApiProperty({ 
        example: 'msg_abc123xyz',
        description: 'Gmail message ID'
    })
    @IsString()
    @IsNotEmpty()
    messageId: string;

    @ApiProperty({ 
        example: 'thread_def456uvw',
        description: 'Gmail thread ID'
    })
    @IsString()
    @IsNotEmpty()
    threadId: string;

    @ApiProperty({ 
        example: 'support@provider.com',
        description: 'Email address of sender'
    })
    @IsEmail()
    @IsNotEmpty()
    fromEmail: string;

    @ApiProperty({ 
        example: 'Re: Request for Rate Review',
        description: 'Email subject'
    })
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty({ 
        example: 'Thank you for reaching out. We have reviewed your request...',
        description: 'Full email body content'
    })
    @IsString()
    @IsNotEmpty()
    body: string;

    @ApiPropertyOptional({ 
        example: 'Thank you for reaching out. We have reviewed...',
        description: 'Email snippet/preview'
    })
    @IsString()
    @IsOptional()
    snippet?: string;

    @ApiProperty({ 
        example: '2024-01-15T14:30:00Z',
        description: 'When the email was received'
    })
    @IsDateString()
    @IsNotEmpty()
    receivedAt: string;
}