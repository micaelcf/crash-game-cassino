import { ApiProperty } from '@nestjs/swagger';
import { Wallet } from '../../../domain/wallet/wallet.entity';

export class WalletDto {
  @ApiProperty({ description: 'Wallet identifier.' })
  id!: string;

  @ApiProperty({ description: 'Owner player id (matches JWT sub claim).' })
  playerId!: string;

  @ApiProperty({
    description:
      'Balance in integer cents as a string to preserve BigInt precision.',
    example: '100000',
  })
  balance!: string;

  @ApiProperty({ required: false, type: String, format: 'date-time' })
  createdAt?: Date;
}

export const toWalletDto = (wallet: Wallet): WalletDto => ({
  id: wallet.id,
  playerId: wallet.playerId,
  balance: wallet.balance.toString(),
  createdAt: wallet.createdAt,
});
