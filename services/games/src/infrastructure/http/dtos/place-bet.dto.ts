import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class PlaceBetDto {
  @ApiProperty({
    description: 'Bet amount in integer cents, e.g. "1000" for R$ 10.00.',
    example: '1000',
  })
  @IsString()
  @Matches(/^[0-9]+$/, {
    message: 'amount must be a positive integer string in cents',
  })
  @MaxLength(20)
  amount!: string;
}
