import type { Wallet } from '@domain/wallet/wallet.entity'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Wire shape for the player wallet. Balance is integer cents serialized
 * as a string to preserve BigInt precision over JSON.
 */
export class WalletDto {
	@ApiProperty({ format: 'uuid', description: 'Wallet identifier.' })
	id!: string

	@ApiProperty({ description: 'Owner player id (matches JWT sub claim).' })
	playerId!: string

	@ApiProperty({
		description:
			'Balance in integer cents as a string to preserve BigInt precision.',
		example: '100000',
	})
	balance!: string

	@ApiProperty({ required: false, type: String, format: 'date-time' })
	createdAt?: string
}

export const toWalletDto = (wallet: Wallet): WalletDto => ({
	id: wallet.id,
	playerId: wallet.playerId,
	balance: wallet.balance.toString(),
	createdAt: wallet.createdAt?.toISOString(),
})
