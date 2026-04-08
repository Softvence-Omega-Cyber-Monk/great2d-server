import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AppleVerifyDto {
  @ApiProperty({
    example: '2000000123456789',
    description: 'Unique transaction ID from Apple',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    example: 'eyJhbG...',
    description: 'The JWS representation of the transaction from Apple',
  })
  @IsString()
  @IsNotEmpty()
  jwsRepresentation: string;
}
