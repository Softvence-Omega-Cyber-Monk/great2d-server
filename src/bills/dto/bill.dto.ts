import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

enum BillCategory {
    INTERNET = 'internet',
    ELECTRICITY = 'electricity',
    WATER = 'water',
    MOBILE = 'mobile',
    GAS = 'gas',
    OTHER = 'other'
}

enum BillStatus {
    SUCCESSFULL = 'successfull',
    NEGOTIATING = 'negotiating',
    FAILED = 'failed'
}

export class CreateBillDto {
    @ApiProperty({ example: 'Comcast Internet' })
    @IsString()
    @IsNotEmpty()
    billName: string;

    @ApiProperty({ example: BillCategory.INTERNET, enum: BillCategory })
    @IsString()
    @IsNotEmpty()
    @IsEnum(BillCategory)
    category: BillCategory;

    @ApiProperty({ example: 'Bill Provider Name' })
    @IsString()
    @IsNotEmpty()
    provider: string;

    @ApiProperty({ example: BillStatus.NEGOTIATING, enum: BillStatus })
    @IsString()
    @IsNotEmpty()
    @IsEnum(BillStatus)
    status: BillStatus;

    @ApiProperty({ example: 99 })
    @IsNumber()
    @IsNotEmpty()
    previousRate: number;

    @ApiProperty({ example: 89 })
    @IsNumber()
    @IsNotEmpty()
    newRate: number;

}

export class UpdateBillDto {
    @ApiProperty({ example: 'Comcast Internet', required: false })
    @IsString()
    billName?: string;

    @ApiProperty({ example: BillCategory.INTERNET, enum: BillCategory, required: false })
    @IsString()
    @IsEnum(BillCategory)
    category?: BillCategory;

    @ApiProperty({ example: 'Bill Provider Name', required: false })
    @IsString()
    provider?: string;

    @ApiProperty({ example: BillStatus.NEGOTIATING, enum: BillStatus, required: false })
    @IsString()
    @IsEnum(BillStatus)
    status?: BillStatus;

    @ApiProperty({ example: 99 })
    @IsNumber()
    @IsNotEmpty()
    previousRate: number;

    @ApiProperty({ example: 89 })
    @IsNumber()
    @IsNotEmpty()
    newRate: number;
    
    @ApiProperty()
    createdAt?: Date;

    @ApiProperty()
    updatedAt?: Date;
}   